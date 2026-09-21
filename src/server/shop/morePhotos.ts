// server-only — never import from a 'use client' file.
// "Create more photos": which angles each product already has, across every batch in the workspace.

import { prisma } from '../../lib/db';

/** Shots already made or in progress per product (failed photos don't count, so they can be tried again). */
export const madeShotsByProduct = async (workspaceId: string, productIds: readonly string[]): Promise<Map<string, string[]>> => {
  const rows = await prisma.batchItem.findMany({
    where: { productId: { in: [...productIds] }, shot: { not: null }, status: { not: 'failed' }, batch: { workspaceId, preview: false } },
    select: { productId: true, shot: true },
    distinct: ['productId', 'shot'],
  });
  const made = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.productId || !row.shot) continue;
    made.set(row.productId, [...(made.get(row.productId) ?? []), row.shot]);
  }
  return made;
};
