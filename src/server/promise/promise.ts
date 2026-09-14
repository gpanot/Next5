// server-only — never import from a 'use client' file.

import type { PromiseClaim } from '@prisma/client';
import { PLANS, isPlanId } from '../../config/plans';
import { PROMISE, type PromiseMetric, type PromisePlatform } from '../../config/promise';
import { prisma } from '../../lib/db';
import { grant } from '../credits/ledger';
import { withSerializable } from '../db/transaction';
import { HttpError } from '../http';

const DAY = 86_400_000;

export type ClaimInput = {
  platform: PromisePlatform;
  metric: PromiseMetric;
  beforeAverage: number;
  afterAverage: number;
  postsCounted: number;
  links: string[];
  note: string | null;
  sharePermission: boolean;
};

export type PromiseStatus = {
  eligible: boolean;
  reason: 'no_plan' | 'too_early' | 'cooldown' | null;
  eligibleFrom: string | null;
  lastClaim: { status: string; outcome: string; createdAt: string } | null;
};

const paidSince = async (workspaceId: string): Promise<Date | null> => {
  const first = await prisma.subscription.findFirst({ where: { workspaceId, status: { in: ['active', 'expired'] }, startsAt: { not: null } }, orderBy: { startsAt: 'asc' }, select: { startsAt: true } });
  return first?.startsAt ?? null;
};

/** Whether the workspace can claim now: a paid plan for at least the promise window, one claim per cooldown. */
export const promiseStatus = async (workspaceId: string, now = new Date()): Promise<PromiseStatus> => {
  const [since, last] = await Promise.all([
    paidSince(workspaceId),
    prisma.promiseClaim.findFirst({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
  ]);
  const lastClaim = last ? { status: last.status, outcome: last.outcome, createdAt: last.createdAt.toISOString() } : null;
  if (!since) return { eligible: false, reason: 'no_plan', eligibleFrom: null, lastClaim };
  const from = new Date(since.getTime() + PROMISE.windowDays * DAY);
  if (now < from) return { eligible: false, reason: 'too_early', eligibleFrom: from.toISOString(), lastClaim };
  if (last && now.getTime() - last.createdAt.getTime() < PROMISE.claimCooldownDays * DAY) {
    return { eligible: false, reason: 'cooldown', eligibleFrom: new Date(last.createdAt.getTime() + PROMISE.claimCooldownDays * DAY).toISOString(), lastClaim };
  }
  return { eligible: true, reason: null, eligibleFrom: null, lastClaim };
};

export const parseClaim = (body: Record<string, unknown>): ClaimInput => {
  const platform = String(body.platform ?? '') as PromisePlatform;
  const metric = String(body.metric ?? '') as PromiseMetric;
  if (!PROMISE.platforms.includes(platform)) throw new HttpError(400, 'invalid_platform', 'Pick where you posted.');
  if (!PROMISE.metrics.includes(metric)) throw new HttpError(400, 'invalid_metric', 'Pick what you measured.');
  const num = (v: unknown) => Math.floor(Number(v));
  const beforeAverage = num(body.beforeAverage);
  const afterAverage = num(body.afterAverage);
  const postsCounted = num(body.postsCounted);
  if (![beforeAverage, afterAverage].every((n) => Number.isFinite(n) && n >= 0 && n < 100_000_000)) throw new HttpError(400, 'invalid_numbers', 'Enter your two averages as whole numbers.');
  if (!Number.isFinite(postsCounted) || postsCounted < PROMISE.postsRequired) throw new HttpError(400, 'not_enough_posts', `Post at least ${PROMISE.postsRequired} Next5 photos first.`);
  const links = (Array.isArray(body.links) ? body.links : []).map((l) => String(l).trim()).filter((l) => /^https?:\/\//.test(l)).slice(0, 12);
  return { platform, metric, beforeAverage, afterAverage, postsCounted, links, note: body.note ? String(body.note).slice(0, 1000) : null, sharePermission: body.sharePermission === true };
};

/** Records a claim. Next5 posts that did better are a win (and a testimonial lead); otherwise a free month is owed. */
export const submitClaim = async (userId: string, workspaceId: string, input: ClaimInput, now = new Date()): Promise<PromiseClaim> => {
  const status = await promiseStatus(workspaceId, now);
  if (!status.eligible) throw new HttpError(409, `promise_${status.reason}`, status.reason === 'no_plan' ? 'The promise starts with a paid plan.' : 'You can claim after your first 30 days.');
  const won = input.afterAverage > input.beforeAverage;
  return prisma.promiseClaim.create({
    data: { workspaceId, userId, ...input, outcome: won ? 'won' : 'missed', status: won ? 'recorded' : 'pending', createdAt: now },
  });
};

/** Admin: grant the free month (plan's monthly photos as bonus credits for 30 days) or decline with a note. */
export const decideClaim = async (claimId: string, decision: 'grant' | 'decline', adminNote: string | null, now = new Date()): Promise<PromiseClaim> =>
  withSerializable(async (tx) => {
    const claim = await tx.promiseClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new HttpError(404, 'claim_not_found', 'Claim not found.');
    if (claim.status !== 'pending') throw new HttpError(409, 'claim_decided', 'This claim was already decided.');
    if (decision === 'grant') {
      const sub = await tx.subscription.findFirst({ where: { workspaceId: claim.workspaceId, startsAt: { not: null } }, orderBy: { startsAt: 'desc' } });
      const credits = sub && isPlanId(sub.planId) ? PLANS[sub.planId].monthlyCredits : 30;
      await grant(tx, { workspaceId: claim.workspaceId, bucket: 'bonus', amount: credits, reason: 'admin_adjust', refType: 'promise', refId: claim.id, expiresAt: new Date(now.getTime() + PROMISE.windowDays * DAY), note: 'Beat-your-feed promise: free month' });
    }
    return tx.promiseClaim.update({ where: { id: claim.id }, data: { status: decision === 'grant' ? 'granted' : 'declined', adminNote, decidedAt: now } });
  });
