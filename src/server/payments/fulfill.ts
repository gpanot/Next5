// server-only — never import from a 'use client' file.
// Spec: docs/business-studios/02-architecture.md §7.3 step 6.

import type { Payment } from '@prisma/client';
import { TOPUPS, isTopupId } from '../../config/plans';
import { addMonths } from '../../lib/dates';
import { grant } from '../credits/ledger';
import { withSerializable, type Tx } from '../db/transaction';
import { HttpError } from '../http';
import { activate } from '../subscriptions/subscriptions';
import { sendOnceQuietly } from '../email/send';
import { paymentReceiptEmail } from '../email/templates';
import { describePaymentItem } from './payments';

/** Payments that arrive this long after the QR expired are still honoured. */
export const LATE_PAYMENT_WINDOW_MS = 72 * 60 * 60 * 1000;

export type MarkPaidResult = { payment: Payment; outcome: 'paid' | 'underpaid' | 'duplicate' | 'too_late' };

const fulfilInTx = async (tx: Tx, payment: Payment, now: Date): Promise<void> => {
  if (payment.purpose === 'subscription') {
    const sub = await tx.subscription.findUnique({ where: { paymentId: payment.id } });
    if (!sub) throw new Error(`No subscription for payment ${payment.id}`);
    await activate(tx, sub.id, now);
  } else if (payment.purpose === 'topup' && isTopupId(payment.itemId) && payment.workspaceId) {
    const topup = TOPUPS[payment.itemId];
    await grant(tx, {
      workspaceId: payment.workspaceId,
      bucket: 'topup',
      amount: topup.credits,
      reason: 'topup_grant',
      refType: 'payment',
      refId: payment.id,
      expiresAt: addMonths(now, topup.validityMonths),
    });
  }
  // consumer_booking fulfilment moves here with the real provider (deferred — D7).
};

const markPaidInTx = async (paymentId: string, paidVnd: number, now: Date): Promise<MarkPaidResult> =>
  withSerializable(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new HttpError(404, 'payment_not_found', 'Payment not found.');

    if (payment.state === 'paid' || payment.fulfilledAt) return { payment, outcome: 'duplicate' };
    if (payment.expiresAt.getTime() + LATE_PAYMENT_WINDOW_MS < now.getTime()) {
      const expired = await tx.payment.update({ where: { id: payment.id }, data: { state: 'expired' } });
      return { payment: expired, outcome: 'too_late' };
    }
    if (paidVnd < payment.amountVnd) {
      const underpaid = await tx.payment.update({ where: { id: payment.id }, data: { state: 'underpaid', paidVnd } });
      return { payment: underpaid, outcome: 'underpaid' };
    }

    await fulfilInTx(tx, payment, now);
    const paid = await tx.payment.update({
      where: { id: payment.id },
      data: { state: 'paid', paidVnd, paidAt: now, fulfilledAt: now },
    });
    return { payment: paid, outcome: 'paid' };
  });

/**
 * Records a received transfer against a payment and fulfils it exactly once, then emails a receipt.
 * Used by the mock "simulate transfer" action now and by the SePay webhook later.
 */
export const markPaidAndFulfil = async (paymentId: string, paidVnd: number, now = new Date()): Promise<MarkPaidResult> => {
  const result = await markPaidInTx(paymentId, paidVnd, now);
  if (result.outcome === 'paid') {
    const p = result.payment;
    sendOnceQuietly({ userId: p.userId, workspaceId: p.workspaceId, template: 'payment_receipt', dedupeKey: `receipt:${p.id}`, content: paymentReceiptEmail(describePaymentItem(p), p.amountUsdCents, p.paidVnd ?? p.amountVnd, p.reference) });
  }
  return result;
};
