// server-only — never import from a 'use client' file.

import type { ProductLine } from '@prisma/client';
import { CONSENT_VERSION, hasRequiredConsents } from '../../config/consents';
import { prisma } from '../../lib/db';
import { sendEmail } from '../../lib/maileroo';
import { signMagicToken, signSessionToken } from '../../lib/studio-auth';
import { THEME } from '../../config/theme';
import { HttpError } from '../http';
import { sendOnceQuietly } from '../email/send';
import { welcomeEmail } from '../email/templates';
import { createWorkspace } from '../workspaces/workspaces';

export type AccountInput = {
  product: ProductLine;
  email: string;
  firstName: string;
  businessName: string;
  industry: string | null;
  handle: string | null;
};

export type AccountResult = { status: 'session'; token: string } | { status: 'check_email' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ProfileInput = Omit<AccountInput, 'email'>;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Profile fields shared by new sign-ups and signed-in users. Business name is optional (not used in image prompts). */
export const parseProfileInput = (body: Record<string, unknown>): ProfileInput => {
  const product = body.product === 'shop' ? 'shop' : body.product === 'brand' ? 'brand' : null;
  const firstName = str(body.firstName, 60);
  if (!product) throw new HttpError(400, 'invalid_product', 'Choose Brand Studio or Shop Studio.');
  if (!firstName) throw new HttpError(400, 'first_name_required', 'Add your first name.');
  return { product, firstName, businessName: str(body.businessName, 80), industry: str(body.industryOrCategory, 30) || null, handle: str(body.handle, 60) || null };
};

export const parseAccountInput = (body: Record<string, unknown>): AccountInput => {
  const email = str(body.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'invalid_email', 'Enter a valid email address.');
  return { ...parseProfileInput(body), email };
};

const sendContinueEmail = async (email: string, product: ProductLine): Promise<void> => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const link = `${appUrl}/start/${product}?token=${signMagicToken(email)}`;
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT5_SEND_DEV_EMAILS !== 'true') {
    console.log('[onboarding] (dev) continue link for', email, '→', link);
    return;
  }
  await sendEmail({
    to: email,
    subject: 'Continue setting up Next5',
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:${THEME.ink}"><h1 style="font-size:22px;margin:0 0 12px">Continue your Next5 setup</h1><p style="font-size:15px;color:${THEME.muted};line-height:1.6;margin:0 0 24px">Use this secure link to pick up where you left off. It expires in 15 minutes.</p><a href="${link}" style="display:inline-block;background:${THEME.accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-size:15px">Continue setup</a></div>`,
    plain: `Continue your Next5 setup: ${link}\nThis link expires in 15 minutes.`,
  });
};

/** Consent types the user accepted at the current version. */
export const givenConsents = async (userId: string): Promise<string[]> => {
  const rows = await prisma.consentRecord.findMany({ where: { userId, version: CONSENT_VERSION }, select: { type: true }, distinct: ['type'] });
  return rows.map((row) => row.type);
};

/**
 * Creates (or returns) the user's workspace for this product and moves onboarding past the account step,
 * and past consent too when the user already accepted everything this studio needs. Idempotent.
 */
export const setupWorkspace = async (userId: string, input: ProfileInput): Promise<void> => {
  const [user, consents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true } }),
    givenConsents(userId),
  ]);
  if (!user.displayName) await prisma.user.update({ where: { id: userId }, data: { displayName: input.firstName } });
  const ws = await createWorkspace({ ownerUserId: userId, product: input.product, name: input.businessName || input.firstName, industry: input.industry, handle: input.handle });
  const step = hasRequiredConsents(input.product, consents) ? 2 : 1;
  if (ws.onboardingStep < step) await prisma.workspace.update({ where: { id: ws.id }, data: { onboardingStep: step } });
  sendOnceQuietly({ userId, workspaceId: ws.id, template: 'welcome', dedupeKey: `welcome:${ws.id}`, content: welcomeEmail(input.firstName, input.product) });
};

/** A signed-in user with one studio adds the other: reuse their name and handle instead of asking again. */
export const addStudio = async (userId: string, product: ProductLine): Promise<void> => {
  const [user, existing] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true } }),
    prisma.workspace.findFirst({ where: { ownerUserId: userId }, orderBy: { createdAt: 'asc' }, select: { name: true, handle: true } }),
  ]);
  const firstName = user.displayName ?? existing?.name;
  if (!firstName) throw new HttpError(400, 'first_name_required', 'Add your first name.');
  // Industry lists differ per studio (industries vs shop categories), so it is not copied.
  await setupWorkspace(userId, { product, firstName, businessName: existing?.name ?? '', industry: null, handle: existing?.handle ?? null });
};

/**
 * Creates the account + workspace. New emails get a session immediately.
 * Existing users (anyone who already has bookings or a workspace) must confirm by email — never hand
 * out a session for an existing account just because someone typed its address. The link lands on
 * /start/{product} signed in; the wizard then calls setupWorkspace with the details saved in the browser.
 */
export const startAccount = async (input: AccountInput): Promise<AccountResult> => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, _count: { select: { workspaces: true, bookings: true } } },
  });
  if (existing && (existing._count.workspaces > 0 || existing._count.bookings > 0)) {
    await sendContinueEmail(input.email, input.product);
    return { status: 'check_email' };
  }

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { displayName: input.firstName },
    create: { email: input.email, displayName: input.firstName },
  });
  await setupWorkspace(user.id, input);
  return { status: 'session', token: signSessionToken(user.id, user.email) };
};
