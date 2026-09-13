// server-only — never import from a 'use client' file.

import type { LedgerReason } from '@prisma/client';
import type { Tx } from '../db/transaction';

/**
 * Ledger model (docs/business-studios/02-architecture.md §5):
 * - A **grant** is a positive row with `grantId = null` (trial, plan, top-up, admin bonus).
 * - Every spend, refund and expiry row points at the grant it affects via `grantId`.
 * - A grant's remaining credits = grant.delta + Σ(rows where grantId = grant.id).
 * - Expired grants (expiresAt <= now) never count toward the balance.
 */

export type CreditBucket = 'trial' | 'plan' | 'bonus' | 'topup';

export const GRANT_REASONS: readonly LedgerReason[] = ['trial_grant', 'plan_grant', 'topup_grant', 'admin_adjust'];

/** Spend order for paid batches: plan credits first, then bonus, then top-ups. */
export const BUCKET_SPEND_ORDER: readonly CreditBucket[] = ['plan', 'bonus', 'topup'];

export type ActiveGrant = {
  grantId: string;
  bucket: CreditBucket;
  remaining: number;
  expiresAt: Date | null;
  createdAt: Date;
};

export type GrantInput = {
  workspaceId: string;
  bucket: CreditBucket;
  amount: number;
  reason: LedgerReason;
  refType: string;
  refId: string;
  expiresAt: Date | null;
  note?: string;
};

/** Adds credits. Idempotent: the same (reason, bucket, refType, refId) grant is written once. */
export const grant = async (tx: Tx, input: GrantInput): Promise<{ id: string; created: boolean }> => {
  if (input.amount <= 0) throw new Error('grant amount must be positive');
  const existing = await tx.creditLedger.findFirst({
    where: { reason: input.reason, bucket: input.bucket, refType: input.refType, refId: input.refId, grantId: null },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const row = await tx.creditLedger.create({
    data: {
      workspaceId: input.workspaceId,
      delta: input.amount,
      reason: input.reason,
      bucket: input.bucket,
      refType: input.refType,
      refId: input.refId,
      expiresAt: input.expiresAt,
      note: input.note ?? null,
    },
    select: { id: true },
  });
  return { id: row.id, created: true };
};

/** All unexpired grants for a workspace with their remaining credits (including zero). */
export const listActiveGrants = async (tx: Tx, workspaceId: string, now: Date): Promise<ActiveGrant[]> => {
  const grants = await tx.creditLedger.findMany({
    where: {
      workspaceId,
      grantId: null,
      delta: { gt: 0 },
      reason: { in: [...GRANT_REASONS] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true, bucket: true, delta: true, expiresAt: true, createdAt: true },
  });
  if (grants.length === 0) return [];

  const sums = await tx.creditLedger.groupBy({
    by: ['grantId'],
    where: { grantId: { in: grants.map((g) => g.id) } },
    _sum: { delta: true },
  });
  const usedByGrant = new Map(sums.map((s) => [s.grantId, s._sum.delta ?? 0]));

  return grants.map((g) => ({
    grantId: g.id,
    bucket: g.bucket as CreditBucket,
    remaining: g.delta + (usedByGrant.get(g.id) ?? 0),
    expiresAt: g.expiresAt,
    createdAt: g.createdAt,
  }));
};

/** Sorts grants in spend order: bucket order, then soonest expiry, then oldest. */
export const sortForSpending = (grants: readonly ActiveGrant[]): ActiveGrant[] =>
  [...grants].sort((a, b) => {
    const bucketDiff = bucketRank(a.bucket) - bucketRank(b.bucket);
    if (bucketDiff !== 0) return bucketDiff;
    const aExp = a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bExp = b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aExp !== bExp) return aExp - bExp;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

const bucketRank = (bucket: CreditBucket): number => {
  const index = BUCKET_SPEND_ORDER.indexOf(bucket);
  return index === -1 ? BUCKET_SPEND_ORDER.length : index;
};
