// server-only — never import from a 'use client' file.
//
// Caption Auto Fit results kept per library asset, so a clip or image a new batch shows again is not sent to the
// vision models again. Two things are kept in the asset's descriptor JSON (no extra table; a re-described asset
// simply fits again):
//   captionFits     fitted height by frame (trim) and caption box (lines, width): not by words, nor by where the
//                   caption started (a card refitted later starts from its first placement)
//   captionRegions  the frame's heads and main subject by trim: the caption is placed off them with geometry alone

import { prisma } from '../../../lib/db';
import type { BackgroundRegions } from '../../labs/blitzAutoFitGeometry';

/** Caption widths within one step (canvas px) share a fit. */
const WIDTH_STEP = 120;

export const regionsKey = (trimStart: number) => trimStart.toFixed(1);

export const fitCacheKey = (trimStart: number, box: { w: number; h: number }, lineHeight: number) =>
  `${regionsKey(trimStart)}|${Math.round(box.h / lineHeight)}|${Math.ceil(box.w / WIDTH_STEP)}`;

export type SavedFits = { fits: Record<string, number>; regions: Record<string, BackgroundRegions> };

/** Saved fits and regions of these assets, by asset id. Empty on failure. */
export async function loadFits(assetIds: string[]): Promise<Map<string, SavedFits>> {
  if (assetIds.length === 0) return new Map();
  type Row = { id: string; fits: Record<string, number> | null; regions: Record<string, BackgroundRegions> | null };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT blitz_asset_id AS id, descriptor->'captionFits' AS fits, descriptor->'captionRegions' AS regions
    FROM asset_descriptors
    WHERE blitz_asset_id = ANY(${assetIds}::text[]) AND (descriptor ? 'captionFits' OR descriptor ? 'captionRegions')`
    .catch((err: unknown) => {
      console.warn('[caption-fit] cache unreadable:', err instanceof Error ? err.message : err);
      return [] as Row[];
    });
  return new Map(rows.map((r) => [r.id, { fits: r.fits ?? {}, regions: r.regions ?? {} }]));
}

/** Merges `value` under `field`.`key` of the asset's descriptor. Never throws. */
async function mergeInto(assetId: string, field: 'captionFits' | 'captionRegions', key: string, value: unknown): Promise<void> {
  await prisma.$executeRaw`
    UPDATE asset_descriptors
    SET descriptor = jsonb_set(coalesce(descriptor, '{}'::jsonb), ${[field]}::text[],
      coalesce(descriptor->${field}, '{}'::jsonb) || jsonb_build_object(${key}::text, ${JSON.stringify(value)}::jsonb))
    WHERE blitz_asset_id = ${assetId}`
    .then(() => undefined)
    .catch((err: unknown) => console.warn(`[caption-fit] ${field} not cached:`, err instanceof Error ? err.message : err));
}

/** Saves one fitted height and the frame's regions (when known). */
export async function saveFit(assetId: string, trimStart: number, key: string, positionY: number, regions: BackgroundRegions | null): Promise<void> {
  await mergeInto(assetId, 'captionFits', key, positionY);
  // Unknown heads (detection failed) are not saved: geometry must never place a caption as if there were none.
  if (regions) await mergeInto(assetId, 'captionRegions', regionsKey(trimStart), regions);
}
