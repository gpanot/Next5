// server-only — never import from a 'use client' file.

import { prisma } from '../../lib/db';

import type { BusinessMetrics } from '../../types/business/admin';
import { shopAccuracy } from './accuracy';

export type { BusinessMetrics };

const count = (rows: { key: string | null; n: number }[]): Record<string, number> =>
  Object.fromEntries(rows.map((r) => [r.key ?? 'unknown', r.n]));

/** Funnel + unit economics for the last `days` days. */
export const businessMetrics = async (days: number, now = new Date()): Promise<BusinessMetrics> => {
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Run in two batches of 6 to avoid exhausting the connection pool (limit=20 but shared with UGC and
  // other admin endpoints).  Each batch opens at most 6 connections; sequential batches reuse them.
  const [brand, shop, completed, trials, paid, active] = await Promise.all([
    prisma.workspace.count({ where: { product: 'brand', createdAt: { gte: from } } }),
    prisma.workspace.count({ where: { product: 'shop', createdAt: { gte: from } } }),
    prisma.workspace.count({ where: { onboardingCompletedAt: { gte: from } } }),
    prisma.workspace.count({ where: { trialUsedAt: { gte: from } } }),
    prisma.payment.aggregate({ where: { state: 'paid', paidAt: { gte: from } }, _count: true, _sum: { amountUsdCents: true, paidVnd: true } }),
    prisma.subscription.groupBy({ by: ['planId'], where: { status: 'active', endsAt: { gt: now } }, _count: { _all: true } }),
  ]);
  const [batches, ready, failed, redos, cost, paidWorkspaces] = await Promise.all([
    prisma.batch.count({ where: { createdAt: { gte: from }, kind: { not: 'trial' } } }),
    prisma.batchItem.count({ where: { status: 'ready', createdAt: { gte: from } } }),
    prisma.batchItem.count({ where: { status: 'failed', createdAt: { gte: from } } }),
    prisma.batchItem.groupBy({ by: ['redoReason'], where: { redoReason: { not: null }, createdAt: { gte: from } }, _count: { _all: true } }),
    prisma.batch.aggregate({ where: { createdAt: { gte: from } }, _sum: { costUsdMicros: true } }),
    prisma.payment.groupBy({ by: ['workspaceId'], where: { state: 'paid', purpose: 'subscription' } }),
  ]);
  const reasonCounts = count(redos.map((r) => ({ key: (r.redoReason ?? '').split(':')[0] ?? null, n: r._count._all })));
  const redoTotal = Object.values(reasonCounts).reduce((a, b) => a + b, 0);
  const trialWorkspaces = await prisma.workspace.findMany({ where: { trialUsedAt: { gte: from } }, select: { id: true } });
  const paidSet = new Set(paidWorkspaces.map((p) => p.workspaceId));
  return {
    from: from.toISOString(),
    signups: { brand, shop },
    onboardingCompleted: completed,
    trials,
    paidPayments: paid._count,
    revenueUsdCents: paid._sum.amountUsdCents ?? 0,
    revenueVnd: paid._sum.paidVnd ?? 0,
    activePlans: count(active.map((a) => ({ key: a.planId, n: a._count._all }))),
    batches,
    itemsReady: ready,
    itemsFailed: failed,
    redoRate: ready ? redoTotal / ready : 0,
    redoReasons: reasonCounts,
    providerCostUsd: (cost._sum.costUsdMicros ?? 0) / 1_000_000,
    trialToPaid: trialWorkspaces.length ? trialWorkspaces.filter((w) => paidSet.has(w.id)).length / trialWorkspaces.length : 0,
    shopAccuracy: await shopAccuracy(from),
  };
};
