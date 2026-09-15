// server-only — never import from a 'use client' file.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { sendEmail } from '../../lib/maileroo';
import { scopeAppPath } from '../../lib/studioPaths';
import { renderEmail, type EmailContent } from './layout';

export type SendOnceInput = { userId: string; workspaceId?: string | null; template: string; dedupeKey: string; content: EmailContent };

const shouldDeliver = (): boolean => process.env.NODE_ENV === 'production' || process.env.NEXT5_SEND_DEV_EMAILS === 'true';

/** Email buttons point at /app/...; send them to the right studio (/app/brand or /app/shop) for this workspace. */
const scopeCta = async (content: EmailContent, workspaceId: string | null): Promise<EmailContent> => {
  if (!content.cta || !workspaceId) return content;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { product: true } });
  if (!ws) return content;
  try {
    const url = new URL(content.cta.url);
    return { ...content, cta: { ...content.cta, url: `${url.origin}${scopeAppPath(`${url.pathname}${url.search}`, ws.product)}` } };
  } catch {
    return content;
  }
};

/**
 * Sends an email at most once per dedupeKey. The log row is written first (unique), so a concurrent or
 * repeated cron run can never double-send. Returns false when it was already sent or queued.
 */
export const sendOnce = async (input: SendOnceInput): Promise<boolean> => {
  let logId: string;
  try {
    const row = await prisma.emailLog.create({ data: { userId: input.userId, workspaceId: input.workspaceId ?? null, template: input.template, dedupeKey: input.dedupeKey } });
    logId = row.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
  if (!user) return false;
  const email = renderEmail(await scopeCta(input.content, input.workspaceId ?? null));
  try {
    if (shouldDeliver()) await sendEmail({ to: user.email, subject: email.subject, html: email.html, plain: email.plain });
    else console.log(`[email] (dev) ${input.template} → ${user.email}: ${email.subject}`);
    await prisma.emailLog.update({ where: { id: logId }, data: { sentAt: new Date() } });
    return true;
  } catch (err) {
    await prisma.emailLog.update({ where: { id: logId }, data: { error: err instanceof Error ? err.message.slice(0, 300) : 'send failed' } });
    return false;
  }
};

/** Fire-and-forget wrapper for request paths: never throws. */
export const sendOnceQuietly = (input: SendOnceInput): void => {
  sendOnce(input).catch((err: unknown) => console.error('[email] send failed', input.template, err));
};
