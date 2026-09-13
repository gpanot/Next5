// server-only — never import from a 'use client' file.

import type { ProductLine } from '@prisma/client';
import { prisma } from '../../lib/db';
import { sendEmail } from '../../lib/maileroo';
import { signMagicToken, signSessionToken } from '../../lib/studio-auth';
import { HttpError } from '../http';
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

export const parseAccountInput = (body: Record<string, unknown>): AccountInput => {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const product = body.product === 'shop' ? 'shop' : body.product === 'brand' ? 'brand' : null;
  const email = str(body.email, 160).toLowerCase();
  const firstName = str(body.firstName, 60);
  const businessName = str(body.businessName, 80);
  if (!product) throw new HttpError(400, 'invalid_product', 'Choose Brand Studio or Shop Studio.');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'invalid_email', 'Enter a valid email address.');
  if (!firstName) throw new HttpError(400, 'first_name_required', 'Add your first name.');
  if (!businessName) throw new HttpError(400, 'business_required', product === 'brand' ? 'Add your business name.' : 'Add your shop name.');
  return { product, email, firstName, businessName, industry: str(body.industryOrCategory, 30) || null, handle: str(body.handle, 60) || null };
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
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1f1c19"><h1 style="font-size:22px;margin:0 0 12px">Continue your Next5 setup</h1><p style="font-size:15px;color:#6b635a;line-height:1.6;margin:0 0 24px">Use this secure link to pick up where you left off. It expires in 15 minutes.</p><a href="${link}" style="display:inline-block;background:#b8683f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-size:15px">Continue setup</a></div>`,
    plain: `Continue your Next5 setup: ${link}\nThis link expires in 15 minutes.`,
  });
};

/**
 * Creates the account + workspace. New emails get a session immediately.
 * Existing users (anyone who already has bookings or a workspace) must confirm by email — never hand
 * out a session for an existing account just because someone typed its address.
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
  const ws = await createWorkspace({ ownerUserId: user.id, product: input.product, name: input.businessName, industry: input.industry, handle: input.handle });
  await prisma.workspace.update({ where: { id: ws.id }, data: { onboardingStep: Math.max(ws.onboardingStep, 1) } });
  return { status: 'session', token: signSessionToken(user.id, user.email) };
};
