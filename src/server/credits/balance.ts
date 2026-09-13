// server-only — never import from a 'use client' file.

import { prisma } from '../../lib/db';
import type { Tx } from '../db/transaction';
import { listActiveGrants, type CreditBucket } from './grants';

export type Balance = {
  /** Credits usable by normal (paid) batches — excludes trial credits. */
  total: number;
  /** Credits usable only by the free trial batch. */
  trial: number;
  byBucket: Record<CreditBucket, number>;
  /** Soonest expiry among grants that still have credits, with how many expire then. */
  nextExpiry: { at: Date; credits: number } | null;
};

const emptyBuckets = (): Record<CreditBucket, number> => ({ trial: 0, plan: 0, bonus: 0, topup: 0 });

export const getBalance = async (workspaceId: string, now: Date = new Date(), db: Tx = prisma): Promise<Balance> => {
  const grants = (await listActiveGrants(db, workspaceId, now)).filter((g) => g.remaining > 0);
  const byBucket = emptyBuckets();
  for (const g of grants) byBucket[g.bucket] += g.remaining;

  const expiring = grants
    .filter((g) => g.bucket !== 'trial' && g.expiresAt !== null)
    .sort((a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0));
  const first = expiring[0];
  const nextExpiry = first?.expiresAt
    ? {
        at: first.expiresAt,
        credits: expiring
          .filter((g) => g.expiresAt?.getTime() === first.expiresAt?.getTime())
          .reduce((sum, g) => sum + g.remaining, 0),
      }
    : null;

  return {
    total: byBucket.plan + byBucket.bonus + byBucket.topup,
    trial: byBucket.trial,
    byBucket,
    nextExpiry,
  };
};
