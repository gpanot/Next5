// server-only — never import from a 'use client' file.
// Background music from the shared Assets Library (blitz_assets type AUDIO): a random track per slideshow at generation,
// changeable in the editor. Used for the preview and the ZIP; TikTok's photo API cannot attach it.

import { prisma } from '../../lib/db';
import type { AutoTrackDto } from '../../types/admin/autoSlideshow';
import { blitzBrowserUrl } from '../admin/blitzStore';

type TrackRow = { id: string; name: string; r2_key: string; best_start: number | null };

/** Shared audio tracks, by name. The start point is the descriptor's best start when the track was described. */
const loadTracks = () =>
  prisma.$queryRaw<TrackRow[]>`
    SELECT a.id, a.name, a.r2_key, (d.descriptor->>'bestStart')::float AS best_start
    FROM blitz_assets a LEFT JOIN asset_descriptors d ON d.blitz_asset_id = a.id
    WHERE a.type = 'AUDIO' AND a.workspace_id IS NULL
    ORDER BY lower(a.name)`;

export const listTracks = async (): Promise<AutoTrackDto[]> =>
  Promise.all((await loadTracks()).map(async (t) => ({ assetId: t.id, name: t.name, url: await blitzBrowserUrl(t.r2_key), startAt: t.best_start ?? 0 })));

/** `count` random tracks, all different while the library has enough. Empty when the library has no audio. */
export const pickTracks = async (count: number): Promise<Array<{ assetId: string; startAt: number }>> => {
  const tracks = await loadTracks();
  if (tracks.length === 0) return [];
  const shuffled = [...tracks].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) => {
    const t = shuffled[i % shuffled.length]!;
    return { assetId: t.id, startAt: t.best_start ?? 0 };
  });
};

export const trackDto = async (asset: { id: string; name: string; r2Key: string } | null, startAt: number): Promise<AutoTrackDto | null> =>
  asset ? { assetId: asset.id, name: asset.name, url: await blitzBrowserUrl(asset.r2Key), startAt } : null;

/** A track id the editor may pick (shared audio only). */
export const isTrack = async (assetId: string): Promise<{ startAt: number } | null> => {
  const rows = await prisma.$queryRaw<Array<{ best_start: number | null }>>`
    SELECT (d.descriptor->>'bestStart')::float AS best_start
    FROM blitz_assets a LEFT JOIN asset_descriptors d ON d.blitz_asset_id = a.id
    WHERE a.id = ${assetId} AND a.type = 'AUDIO' AND a.workspace_id IS NULL`;
  return rows[0] ? { startAt: rows[0].best_start ?? 0 } : null;
};
