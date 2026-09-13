// server-only — never import from a 'use client' file.
// Spec: docs/business-studios/02-architecture.md §7 (mock provider — decision D7).

import { Prisma, type Payment } from '@prisma/client';
import { VND_PER_USD } from '../../config/business';
import { PLANS, TOPUPS, getTermPriceUsdCents, type PlanId, type TermMonths, type TopupId } from '../../config/plans';
import { usdCentsToVnd } from '../../lib/money';
import { prisma } from '../../lib/db';
import { withSerializable } from '../db/transaction';
import { HttpError } from '../http';
import { createPendingSubscription } from '../subscriptions/subscriptions';
import { currentPaymentProvider, REQUEST_TTL_MS } from './mockProvider';
import { createReference } from './reference';

export const PAYMENT_TTL_MS = 30 * 60 * 1000;

type Owner = { userId: string; workspaceId: string };

const createPaymentRow = async (
  tx: Prisma.TransactionClient,
  data: Omit<Prisma.PaymentUncheckedCreateInput, 'reference' | 'expiresAt' | 'provider'>,
): Promise<Payment> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = createReference();
    const taken = await tx.payment.findUnique({ where: { reference }, select: { id: true } });
    if (taken) continue;
    const provider = currentPaymentProvider();
    const ttl = provider === 'request' ? REQUEST_TTL_MS : PAYMENT_TTL_MS;
    return tx.payment.create({ data: { ...data, reference, provider, expiresAt: new Date(Date.now() + ttl) } });
  }
  throw new Error('Could not allocate a unique payment reference');
};

export const createSubscriptionPayment = async (
  owner: Owner,
  input: { planId: PlanId; termMonths: TermMonths },
): Promise<Payment> =>
  withSerializable(async (tx) => {
    const amountUsdCents = getTermPriceUsdCents(input.planId, input.termMonths);
    const sub = await createPendingSubscription(tx, { workspaceId: owner.workspaceId, ...input });
    const payment = await createPaymentRow(tx, {
      userId: owner.userId,
      workspaceId: owner.workspaceId,
      purpose: 'subscription',
      itemId: `${input.planId}:${input.termMonths}`,
      amountUsdCents,
      amountVnd: usdCentsToVnd(amountUsdCents, VND_PER_USD),
      fxVndPerUsd: VND_PER_USD,
    });
    await tx.subscription.update({ where: { id: sub.id }, data: { paymentId: payment.id } });
    return payment;
  });

export const createTopupPayment = async (owner: Owner, topupId: TopupId): Promise<Payment> =>
  withSerializable((tx) =>
    createPaymentRow(tx, {
      userId: owner.userId,
      workspaceId: owner.workspaceId,
      purpose: 'topup',
      itemId: topupId,
      amountUsdCents: TOPUPS[topupId].usdCents,
      amountVnd: usdCentsToVnd(TOPUPS[topupId].usdCents, VND_PER_USD),
      fxVndPerUsd: VND_PER_USD,
    }),
  );

/** Loads a payment the user owns; marks it expired when its QR window has passed. */
export const getPaymentForUser = async (paymentId: string, userId: string, now = new Date()): Promise<Payment> => {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
  if (!payment) throw new HttpError(404, 'payment_not_found', 'Payment not found.');
  if (payment.state === 'pending' && payment.expiresAt <= now) {
    return prisma.payment.update({ where: { id: payment.id }, data: { state: 'expired' } });
  }
  return payment;
};

export const listPaymentsForWorkspace = async (workspaceId: string, take = 50): Promise<Payment[]> =>
  prisma.payment.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take });

/** Human label for a payment line item, e.g. "Brand Pro · 3 months" or "60 photos top-up". */
export const describePaymentItem = (payment: Pick<Payment, 'purpose' | 'itemId'>): string => {
  if (payment.purpose === 'topup' && payment.itemId in TOPUPS) {
    return `${TOPUPS[payment.itemId as TopupId].credits} photos top-up`;
  }
  const [planId, term] = payment.itemId.split(':');
  if (planId && planId in PLANS) {
    const plan = PLANS[planId as PlanId];
    const product = plan.product === 'brand' ? 'Brand' : 'Shop';
    return `${product} ${plan.name} · ${term} ${term === '1' ? 'month' : 'months'}`;
  }
  return payment.purpose === 'consumer_booking' ? 'Next5 Photos shoot' : payment.itemId;
};
