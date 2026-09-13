// server-only — never import from a 'use client' file.

import type { LedgerReason } from '@prisma/client';
import type { Tx } from '../db/transaction';
import { listActiveGrants, sortForSpending, type ActiveGrant } from './grants';

export class InsufficientCreditsError extends Error {
  readonly needed: number;
  readonly available: number;

  constructor(needed: number, available: number) {
    super(`Insufficient credits: needed ${needed}, available ${available}`);
    this.name = 'InsufficientCreditsError';
    this.needed = needed;
    this.available = available;
  }
}

type Allocation = { grant: ActiveGrant; take: number };

const allocate = (grants: readonly ActiveGrant[], credits: number): Allocation[] => {
  const available = grants.reduce((sum, g) => sum + g.remaining, 0);
  if (available < credits) throw new InsufficientCreditsError(credits, available);

  const allocations: Allocation[] = [];
  let left = credits;
  for (const grant of sortForSpending(grants)) {
    if (left === 0) break;
    const take = Math.min(grant.remaining, left);
    if (take > 0) allocations.push({ grant, take });
    left -= take;
  }
  return allocations;
};

type SpendInput = {
  workspaceId: string;
  credits: number;
  reason: LedgerReason;
  refType: string;
  refId: string;
  trialOnly: boolean;
  now: Date;
};

const spend = async (tx: Tx, input: SpendInput): Promise<void> => {
  if (input.credits <= 0) return;
  const grants = (await listActiveGrants(tx, input.workspaceId, input.now)).filter(
    (g) => g.remaining > 0 && (input.trialOnly ? g.bucket === 'trial' : g.bucket !== 'trial'),
  );
  const allocations = allocate(grants, input.credits);
  await tx.creditLedger.createMany({
    data: allocations.map(({ grant, take }) => ({
      workspaceId: input.workspaceId,
      delta: -take,
      reason: input.reason,
      bucket: grant.bucket,
      grantId: grant.grantId,
      refType: input.refType,
      refId: input.refId,
    })),
  });
};

/** Reserves credits for a new batch. Trial batches draw only from trial credits. Throws InsufficientCreditsError. */
export const reserveForBatch = async (
  tx: Tx,
  input: { workspaceId: string; batchId: string; credits: number; isTrial: boolean; now?: Date },
): Promise<void> =>
  spend(tx, {
    workspaceId: input.workspaceId,
    credits: input.credits,
    reason: 'batch_reserve',
    refType: 'batch',
    refId: input.batchId,
    trialOnly: input.isTrial,
    now: input.now ?? new Date(),
  });

/** Charges a paid redo (after free redos are used). `attempt` makes each charge unique. */
export const chargeRedo = async (
  tx: Tx,
  input: { workspaceId: string; batchId: string; itemId: string; attempt: number; credits: number; now?: Date },
): Promise<void> =>
  spend(tx, {
    workspaceId: input.workspaceId,
    credits: input.credits,
    reason: 'redo_charge',
    refType: 'batch_redo',
    refId: `${input.batchId}/${input.itemId}:${input.attempt}`,
    trialOnly: false,
    now: input.now ?? new Date(),
  });
