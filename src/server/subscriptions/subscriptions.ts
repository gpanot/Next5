// server-only — never import from a 'use client' file.
// Spec: docs/business-studios/02-architecture.md §8.

import type { Subscription } from '@prisma/client';
import { PLANS, isPlanId, type PlanId, type TermMonths } from '../../config/plans';
import { addMonths } from '../../lib/dates';
import { prisma } from '../../lib/db';
import { grant } from '../credits/ledger';
import type { Tx } from '../db/transaction';

export const createPendingSubscription = async (
  tx: Tx,
  input: { workspaceId: string; planId: PlanId; termMonths: TermMonths; paymentId?: string },
): Promise<Subscription> =>
  tx.subscription.create({
    data: {
      workspaceId: input.workspaceId,
      planId: input.planId,
      termMonths: input.termMonths,
      status: 'pending',
      paymentId: input.paymentId ?? null,
    },
  });

/** The subscription covering `now` (active, started, not ended), if any. */
export const getActiveSubscription = async (
  workspaceId: string,
  now: Date = new Date(),
  db: Tx = prisma,
): Promise<Subscription | null> =>
  db.subscription.findFirst({
    where: { workspaceId, status: 'active', startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { startsAt: 'desc' },
  });

/** A paid renewal that starts after the current one ends. */
export const getQueuedRenewal = async (
  workspaceId: string,
  now: Date = new Date(),
  db: Tx = prisma,
): Promise<Subscription | null> =>
  db.subscription.findFirst({
    where: { workspaceId, status: 'active', startsAt: { gt: now } },
    orderBy: { startsAt: 'asc' },
  });

/**
 * Activates a paid subscription (idempotent).
 * - Same plan as the current one → queued renewal starting when the current one ends.
 * - Different plan (upgrade/downgrade) → starts now; the current one is cancelled (no proration).
 */
export const activate = async (tx: Tx, subscriptionId: string, paidAt: Date): Promise<Subscription> => {
  const sub = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  if (sub.status !== 'pending') return sub;

  const current = await latestActive(tx, sub.workspaceId, paidAt, sub.id);
  let startsAt = paidAt;
  if (current?.endsAt && current.planId === sub.planId) {
    startsAt = current.endsAt;
  } else if (current) {
    await tx.subscription.updateMany({
      where: { workspaceId: sub.workspaceId, status: 'active', id: { not: sub.id } },
      data: { status: 'cancelled', endsAt: paidAt },
    });
  }

  const activated = await tx.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'active',
      startsAt,
      endsAt: addMonths(startsAt, sub.termMonths),
      nextGrantAt: startsAt,
    },
  });
  await issueGrantsFor(tx, activated, paidAt);
  return tx.subscription.findUniqueOrThrow({ where: { id: sub.id } });
};

/** The active subscription that ends last (current or queued), excluding `excludeId`. */
const latestActive = async (tx: Tx, workspaceId: string, now: Date, excludeId: string) =>
  tx.subscription.findFirst({
    where: { workspaceId, status: 'active', endsAt: { gt: now }, id: { not: excludeId } },
    orderBy: { endsAt: 'desc' },
  });

/** Issues every monthly grant that is due for one subscription (catches up missed months). */
const issueGrantsFor = async (tx: Tx, sub: Subscription, now: Date): Promise<number> => {
  if (!isPlanId(sub.planId)) return 0;
  const plan = PLANS[sub.planId];
  let issued = 0;
  let next = sub.nextGrantAt;
  let count = sub.grantsIssued;

  while (next && next <= now && count < sub.termMonths) {
    await grant(tx, {
      workspaceId: sub.workspaceId,
      bucket: 'plan',
      amount: plan.monthlyCredits,
      reason: 'plan_grant',
      refType: 'subscription',
      refId: `${sub.id}:${count}`,
      expiresAt: addMonths(next, 1),
    });
    count += 1;
    issued += 1;
    next = addMonths(next, 1);
  }

  if (issued > 0) {
    await tx.subscription.update({
      where: { id: sub.id },
      data: { grantsIssued: count, nextGrantAt: count < sub.termMonths ? next : null },
    });
  }
  return issued;
};

/** Billing cron: issue due monthly grants for all active subscriptions. Returns grants issued. */
export const issueDueGrants = async (tx: Tx, now: Date): Promise<number> => {
  const due = await tx.subscription.findMany({
    where: { status: 'active', nextGrantAt: { lte: now } },
  });
  let total = 0;
  for (const sub of due) total += await issueGrantsFor(tx, sub, now);
  return total;
};

/** Billing cron: mark subscriptions past their end date as expired. Returns how many. */
export const expireEnded = async (tx: Tx, now: Date): Promise<number> => {
  const result = await tx.subscription.updateMany({
    where: { status: 'active', endsAt: { lte: now } },
    data: { status: 'expired' },
  });
  return result.count;
};
