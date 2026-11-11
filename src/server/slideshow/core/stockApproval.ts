// server-only — never import from a 'use client' file.
//
// Our own stock library, kept clean: a stock photo found for a shot (stockImages.ts) stays in its workspace's library
// only, until a video using it goes on the calendar (blitzSchedule.ts). The owner kept that video, so the photo fits
// its line: it then joins the shared library, where decks of other workspaces in the same industry find it (by its
// categories, its audience and the line it showed, all in its retrieval text). Photos never picked stay private.
// The descriptor's `approved` says when, by which workspace, and for which business and industry.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';

const APPROVED_TAG = 'Approved stock';

type Slide = string | { backgroundKey?: string };
type Body = { currentAssets?: { backgroundKey?: string }; slides?: Slide[] };

/** Every file a render request shows. */
const keysOf = (body: Body): string[] => {
  const keys = [body.currentAssets?.backgroundKey, ...(body.slides ?? []).map((s) => (typeof s === 'string' ? undefined : s.backgroundKey))];
  return [...new Set(keys.filter((k): k is string => Boolean(k)))];
};

/** Shares the workspace's own stock photos that this video shows. Returns how many joined the shared library. */
export async function shareApprovedStock(workspaceId: string, body: Body): Promise<number> {
  const keys = keysOf(body);
  if (keys.length === 0) return 0;
  const rows = await prisma.assetDescriptor.findMany({
    where: { source: 'scraped', blitzAsset: { workspaceId, r2Key: { in: keys } } },
    select: { id: true, descriptor: true, blitzAsset: { select: { id: true, tags: true } } },
  });
  if (rows.length === 0) return 0;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { industry: true } });
  const industry = workspace?.industry ?? null;
  const at = new Date().toISOString();
  await prisma.$transaction(rows.flatMap((row) => {
    const asset = row.blitzAsset!;
    const descriptor = (row.descriptor ?? {}) as Record<string, unknown>;
    const picked = descriptor.pickedFor as { business?: string } | undefined;
    const tags = [...new Set([...asset.tags, APPROVED_TAG, ...(industry ? [`Industry: ${industry}`] : [])])];
    const approved = { at, workspaceId, business: picked?.business ?? null, industry };
    return [
      prisma.blitzAsset.update({ where: { id: asset.id }, data: { workspaceId: null, tags } }),
      prisma.assetDescriptor.update({ where: { id: row.id }, data: { workspaceId: null, descriptor: { ...descriptor, approved } as Prisma.InputJsonValue } }),
    ];
  }));
  console.log(`[stockApproval] ${rows.length} stock photo(s) of workspace ${workspaceId} joined the shared library`);
  return rows.length;
}
