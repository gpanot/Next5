// server-only — never import from a 'use client' file.

import type { Payment } from '@prisma/client';
import { prisma } from '../../lib/db';
import { sendEmail } from '../../lib/maileroo';
import { formatUsd } from '../../lib/money';
import { sendOnceQuietly } from '../email/send';
import { requestReceivedEmail } from '../email/templates';
import { describePaymentItem } from './payments';

const notifyAdmin = async (payment: Payment, item: string): Promise<void> => {
  const to = process.env.NEXT5_ADMIN_EMAIL;
  if (!to || process.env.NODE_ENV !== 'production') return;
  const user = await prisma.user.findUnique({ where: { id: payment.userId }, select: { email: true } });
  const price = payment.amountUsdCents !== null ? formatUsd(payment.amountUsdCents, { showCents: true }) : '';
  const line = `${user?.email ?? payment.userId} requested ${item} (${price}) — ${payment.reference}`;
  await sendEmail({ to, subject: `Early access request: ${item}`, html: `<p>${line}</p><p>Activate it in /admin → Payments → Mark paid.</p>`, plain: `${line}\nActivate it in /admin → Payments → Mark paid.` });
};

/** After a payment is created: early-access requests email the customer and the admin. Never throws. */
export const afterPaymentCreated = (payment: Payment): void => {
  if (payment.provider !== 'request') return;
  const item = describePaymentItem(payment);
  sendOnceQuietly({ userId: payment.userId, workspaceId: payment.workspaceId, template: 'request_received', dedupeKey: `request:${payment.id}`, content: requestReceivedEmail(item) });
  notifyAdmin(payment, item).catch((err: unknown) => console.error('[payments] admin notify failed', err));
};
