// server-only — never import from a 'use client' file.

import type { Subscription, Workspace } from '@prisma/client';
import { PLANS, isPlanId, type Plan } from '../config/plans';
import { prisma } from '../lib/db';
import type { BannerDto, BrandExtractData, MeDto, SubscriptionDto, WorkspaceDto } from '../types/business/me';
import { getBalance, type Balance } from './credits/ledger';
import { givenConsents } from './onboarding/account';
import { getActiveSubscription, getQueuedRenewal } from './subscriptions/subscriptions';

const DAY_MS = 24 * 60 * 60 * 1000;

const toSubscriptionDto = (sub: Subscription | null): SubscriptionDto | null => {
  if (!sub || !isPlanId(sub.planId)) return null;
  const plan = PLANS[sub.planId];
  return {
    id: sub.id,
    planId: sub.planId,
    planName: `${plan.product === 'brand' ? 'Brand' : 'Shop'} ${plan.name}`,
    termMonths: sub.termMonths,
    status: sub.status,
    startsAt: sub.startsAt?.toISOString() ?? null,
    endsAt: sub.endsAt?.toISOString() ?? null,
    nextGrantAt: sub.nextGrantAt?.toISOString() ?? null,
    monthlyCredits: plan.monthlyCredits,
  };
};

const toWorkspaceDto = async (ws: Workspace): Promise<WorkspaceDto> => {
  const [identities, influencers, setCount, angles] = await Promise.all([
    prisma.identityReference.count({ where: { workspaceId: ws.id, deletedAt: null } }),
    prisma.influencer.count({ where: { workspaceId: ws.id, status: 'active', baseImageKey: { not: null } } }),
    prisma.studioSet.count({ where: { workspaceId: ws.id, status: { not: 'archived' } } }),
    prisma.workspaceAngle.findMany({
      where: { workspaceId: ws.id },
      orderBy: { position: 'asc' },
      select: { id: true, label: true, weight: true, position: true, source: true },
    }),
  ]);
  return {
    id: ws.id, product: ws.product, name: ws.name, industry: ws.industry, handle: ws.handle,
    brandColors: ws.brandColors, visibleAiTag: ws.visibleAiTag, defaultFormats: ws.defaultFormats,
    onboardingStep: ws.onboardingStep, onboardingCompleted: Boolean(ws.onboardingCompletedAt),
    // hasIdentity is true when selfies or influencer portraits are available.
    trialUsed: Boolean(ws.trialUsedAt), hasIdentity: identities > 0 || influencers > 0, setCount,
    hasInfluencers: influencers > 0,
    // Brand intelligence
    websiteUrl: ws.websiteUrl ?? null,
    mentionFrequency: ws.mentionFrequency,
    genderFilter: ws.genderFilter ?? null,
    anglesGenState: ws.anglesGenState,
    angles,
    // Business profile (Phase 0B)
    audienceType: ws.audienceType ?? null,
    promoting: ws.promoting ?? null,
    offer: ws.offer ?? null,
    // Rich brand extract (from website crawl)
    brandExtract: (ws.brandExtract as BrandExtractData | null) ?? null,
    brandExtractAt: ws.brandExtractAt?.toISOString() ?? null,
  };
};

type BannerInput = { ws: Workspace; active: Subscription | null; queued: Subscription | null; plan: Plan | null; balance: Balance; now: Date };

const computeBanners = async ({ ws, active, queued, plan, balance, now }: BannerInput): Promise<BannerDto[]> => {
  const underpaid = await prisma.payment.findFirst({ where: { workspaceId: ws.id, state: 'underpaid' }, orderBy: { createdAt: 'desc' } });
  if (underpaid) return [{ type: 'payment_underpaid', paymentId: underpaid.id }];

  if (!active) {
    const ended = await prisma.subscription.findFirst({ where: { workspaceId: ws.id, status: 'expired' }, orderBy: { endsAt: 'desc' } });
    if (ended?.endsAt && now.getTime() - ended.endsAt.getTime() < 30 * DAY_MS) return [{ type: 'plan_ended', endedAt: ended.endsAt.toISOString() }];
    return ws.trialUsedAt && !ended ? [{ type: 'trial_no_plan' }] : [];
  }
  const daysLeft = active.endsAt ? Math.ceil((active.endsAt.getTime() - now.getTime()) / DAY_MS) : 99;
  if (daysLeft <= 7 && !queued && active.endsAt) return [{ type: 'renewal_due', endsAt: active.endsAt.toISOString(), daysLeft }];
  if (plan && balance.total < plan.monthlyCredits * 0.2) return [{ type: 'low_credits', remaining: balance.total }];
  return [];
};

/** Everything the app shell needs in one call. `product` picks the workspace when a user has both. */
export const buildMe = async (userId: string, product?: 'brand' | 'shop', now = new Date()): Promise<MeDto> => {
  // Independent queries run together: each one is a network round trip to the database.
  const [user, workspaces, bookings, consents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, displayName: true } }),
    prisma.workspace.findMany({ where: { ownerUserId: userId }, orderBy: { createdAt: 'asc' } }),
    prisma.booking.count({ where: { userId } }),
    givenConsents(userId),
  ]);
  const ws = workspaces.find((w) => w.product === product) ?? workspaces[0] ?? null;
  const emptyBalance = { total: 0, trial: 0, plan: 0, topup: 0, bonus: 0, nextExpiry: null };
  const base = { user: { ...user, consents }, workspaces: workspaces.map((w) => ({ id: w.id, product: w.product, name: w.name })), hasConsumerBookings: bookings > 0 };
  if (!ws) return { ...base, workspace: null, subscription: null, queuedRenewal: null, plan: null, balance: emptyBalance, banners: [] };

  const [active, queued, balance, workspace] = await Promise.all([getActiveSubscription(ws.id, now), getQueuedRenewal(ws.id, now), getBalance(ws.id, now), toWorkspaceDto(ws)]);
  const plan = active && isPlanId(active.planId) ? PLANS[active.planId] : null;
  return {
    ...base,
    workspace,
    subscription: toSubscriptionDto(active),
    queuedRenewal: toSubscriptionDto(queued),
    plan: plan
      ? { id: plan.id, name: plan.name, highRes: plan.highRes, postKit: plan.postKit, allStudioModels: plan.allStudioModels }
      : { id: 'none', name: 'No plan', highRes: false, postKit: false, allStudioModels: false },
    balance: { ...balance.byBucket, total: balance.total, nextExpiry: balance.nextExpiry ? { at: balance.nextExpiry.at.toISOString(), credits: balance.nextExpiry.credits } : null },
    banners: await computeBanners({ ws, active, queued, plan, balance, now }),
  };
};
