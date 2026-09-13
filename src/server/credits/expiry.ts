// server-only — never import from a 'use client' file.

import type { Tx } from '../db/transaction';
import { GRANT_REASONS } from './grants';

/**
 * Writes an `expiry` row for the unconsumed remainder of every grant that expired at or before `now`.
 * Idempotent: a grant is expired once (unique on reason + bucket + ref + grantId).
 * Returns the number of credits expired.
 */
export const expireDue = async (tx: Tx, now: Date, limit = 500): Promise<number> => {
  const expiredGrants = await tx.creditLedger.findMany({
    where: {
      grantId: null,
      delta: { gt: 0 },
      reason: { in: [...GRANT_REASONS] },
      expiresAt: { lte: now },
    },
    select: { id: true, workspaceId: true, bucket: true, delta: true },
    take: limit,
  });
  if (expiredGrants.length === 0) return 0;

  const alreadyExpired = await tx.creditLedger.findMany({
    where: { reason: 'expiry', grantId: { in: expiredGrants.map((g) => g.id) } },
    select: { grantId: true },
  });
  const skip = new Set(alreadyExpired.map((row) => row.grantId));
  const pending = expiredGrants.filter((g) => !skip.has(g.id));
  if (pending.length === 0) return 0;

  const sums = await tx.creditLedger.groupBy({
    by: ['grantId'],
    where: { grantId: { in: pending.map((g) => g.id) } },
    _sum: { delta: true },
  });
  const used = new Map(sums.map((s) => [s.grantId, s._sum.delta ?? 0]));

  const rows = pending
    .map((g) => ({ g, remaining: g.delta + (used.get(g.id) ?? 0) }))
    .filter(({ remaining }) => remaining > 0)
    .map(({ g, remaining }) => ({
      workspaceId: g.workspaceId,
      delta: -remaining,
      reason: 'expiry' as const,
      bucket: g.bucket,
      grantId: g.id,
      refType: 'grant',
      refId: g.id,
    }));

  if (rows.length > 0) await tx.creditLedger.createMany({ data: rows });
  return rows.reduce((sum, row) => sum - row.delta, 0);
};
