// server-only — never import from a 'use client' file.

import { PLANS, isPlanId } from '../../config/plans';
import { prisma } from '../../lib/db';
import { expireDue } from '../credits/ledger';
import { withSerializable } from '../db/transaction';
import { creditsGrantedEmail, planEndedEmail } from '../email/templates';
import { sendOnce } from '../email/send';
import { expireEnded, issueDueGrants } from '../subscriptions/subscriptions';
import { LATE_PAYMENT_WINDOW_MS } from '../payments/fulfill';
import { pruneRateLimits } from '../rateLimit';
import { sendRenewalReminders, sendRestockNudges, sendThemeDrops, sendTrialNudges } from './reminders';

export type BillingDailySummary = {
  grants: number;
  grantEmails: number;
  expiredSubscriptions: number;
  expiredCredits: number;
  expiredPayments: number;
  renewalReminders: number;
  trialNudges: number;
  themeDrops: number;
  restockNudges: number;
};

/** Monthly grants + "your photos are here" emails (skipping the first grant, which the receipt covers). */
const runGrants = async (now: Date): Promise<{ grants: number; emails: number }> => {
  const due = await prisma.subscription.findMany({ where: { status: 'active', nextGrantAt: { lte: now } }, select: { id: true, grantsIssued: true } });
  const before = new Map(due.map((s) => [s.id, s.grantsIssued]));
  const grants = await withSerializable((tx) => issueDueGrants(tx, now));
  let emails = 0;
  const after = await prisma.subscription.findMany({ where: { id: { in: [...before.keys()] } }, include: { workspace: { select: { ownerUserId: true } } } });
  for (const sub of after) {
    if (sub.grantsIssued <= (before.get(sub.id) ?? 0) || sub.grantsIssued < 2 || !isPlanId(sub.planId)) continue;
    const ok = await sendOnce({
      userId: sub.workspace.ownerUserId, workspaceId: sub.workspaceId, template: 'credits_granted', dedupeKey: `grant:${sub.id}:${sub.grantsIssued}`,
      content: creditsGrantedEmail(PLANS[sub.planId].monthlyCredits, sub.nextGrantAt),
    });
    if (ok) emails += 1;
  }
  return { grants, emails };
};

/** Expires ended plans; emails "plan ended" unless a renewal takes over. */
const runExpiries = async (now: Date): Promise<number> => {
  const ending = await prisma.subscription.findMany({ where: { status: 'active', endsAt: { lte: now } }, include: { workspace: { select: { ownerUserId: true } } } });
  const count = await withSerializable((tx) => expireEnded(tx, now));
  for (const sub of ending) {
    const renewed = await prisma.subscription.count({ where: { workspaceId: sub.workspaceId, status: 'active', endsAt: { gt: now } } });
    if (renewed > 0 || !isPlanId(sub.planId)) continue;
    const plan = PLANS[sub.planId];
    await sendOnce({ userId: sub.workspace.ownerUserId, workspaceId: sub.workspaceId, template: 'plan_ended', dedupeKey: `ended:${sub.id}`, content: planEndedEmail(`${plan.product === 'brand' ? 'Brand' : 'Shop'} ${plan.name}`) });
  }
  return count;
};

/** The daily billing cron. Every step is idempotent — running it twice changes nothing. */
export const runBillingDaily = async (now = new Date()): Promise<BillingDailySummary> => {
  const { grants, emails } = await runGrants(now);
  const expiredSubscriptions = await runExpiries(now);
  const expiredCredits = await withSerializable((tx) => expireDue(tx, now));
  const expiredPayments = (await prisma.payment.updateMany({
    where: { state: 'pending', expiresAt: { lt: new Date(now.getTime() - LATE_PAYMENT_WINDOW_MS) } },
    data: { state: 'expired' },
  })).count;
  await pruneRateLimits(now);
  return {
    grants, grantEmails: emails, expiredSubscriptions, expiredCredits, expiredPayments,
    renewalReminders: await sendRenewalReminders(now),
    trialNudges: await sendTrialNudges(now),
    themeDrops: await sendThemeDrops(now),
    restockNudges: await sendRestockNudges(now),
  };
};
