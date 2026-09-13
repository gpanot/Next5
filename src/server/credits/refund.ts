// server-only — never import from a 'use client' file.

import type { Prisma } from '@prisma/client';
import type { Tx } from '../db/transaction';

type GrantBalance = { grantId: string; bucket: string; refundable: number; expiresAt: Date | null };

/** Per grant: credits this batch consumed (reserve + paid redos) minus credits already refunded. */
const refundableByGrant = async (tx: Tx, batchId: string): Promise<GrantBalance[]> => {
  const rows = await tx.creditLedger.findMany({
    where: {
      OR: [
        { reason: 'batch_reserve', refType: 'batch', refId: batchId },
        { reason: 'redo_charge', refType: 'batch_redo', refId: { startsWith: `${batchId}/` } },
        { reason: 'item_refund', refType: 'batch_item', refId: { startsWith: `${batchId}/` } },
      ],
    },
    select: { grantId: true, bucket: true, delta: true },
  });

  const totals = new Map<string, { bucket: string; net: number }>();
  for (const row of rows) {
    if (!row.grantId) continue;
    const current = totals.get(row.grantId) ?? { bucket: row.bucket, net: 0 };
    current.net += row.delta; // spends are negative, refunds positive
    totals.set(row.grantId, current);
  }

  const grantIds = [...totals.keys()];
  const grants = await tx.creditLedger.findMany({
    where: { id: { in: grantIds } },
    select: { id: true, expiresAt: true },
  });
  const expiry = new Map(grants.map((g) => [g.id, g.expiresAt]));

  return grantIds.map((grantId) => ({
    grantId,
    bucket: totals.get(grantId)?.bucket ?? 'plan',
    refundable: -(totals.get(grantId)?.net ?? 0),
    expiresAt: expiry.get(grantId) ?? null,
  }));
};

/**
 * Returns credits for a failed item back to the grants its batch drew from — latest-expiring
 * grants first so refunded credits stay usable as long as possible.
 * Idempotent: the same `refKey` (e.g. `${itemId}` or `${itemId}:2`) refunds once.
 */
export const refundItem = async (
  tx: Tx,
  input: { workspaceId: string; batchId: string; refKey: string; credits: number },
): Promise<number> => {
  const refId = `${input.batchId}/${input.refKey}`;
  const already = await tx.creditLedger.findFirst({
    where: { reason: 'item_refund', refType: 'batch_item', refId },
    select: { id: true },
  });
  if (already || input.credits <= 0) return 0;

  const balances = (await refundableByGrant(tx, input.batchId))
    .filter((g) => g.refundable > 0)
    .sort((a, b) => (b.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (a.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER));

  let left = input.credits;
  const data: Prisma.CreditLedgerCreateManyInput[] = [];
  for (const g of balances) {
    if (left === 0) break;
    const give = Math.min(g.refundable, left);
    data.push({ workspaceId: input.workspaceId, delta: give, reason: 'item_refund', bucket: g.bucket, grantId: g.grantId, refType: 'batch_item', refId });
    left -= give;
  }
  if (data.length > 0) await tx.creditLedger.createMany({ data });
  return input.credits - left;
};
