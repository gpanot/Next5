// server-only — never import from a 'use client' file.
// Background music from the shared Assets Library (blitz_assets type AUDIO). One picker for every kind of content
// (Auto Slideshow slideshows, slideshow ideas, Blitz deck cards and calendar ideas): a random TikTok sound, skipping the
// ones the workspace used lately (see musicPick.ts).
// Changeable in the editor. For slideshows it is used for the preview and the ZIP; TikTok's photo API cannot attach it.

import { prisma } from '../../lib/db';
import type { AutoTrackDto } from '../../types/admin/autoSlideshow';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { chooseTrack } from './musicPick';

type TrackRow = { id: string; name: string; r2_key: string; best_start: number | null; duration_sec: number | null; tiktok: boolean };

/**
 * Shared audio tracks, by name. The start point is the descriptor's best start when the track was described.
 * `tiktok`: tagged "tiktok" in the Assets Library (sounds taken from TikTok), the only tracks generation picks; the
 * editor lists all, our own library sounds at the bottom.
 */
const loadTracks = () =>
  prisma.$queryRaw<TrackRow[]>`
    SELECT a.id, a.name, a.r2_key, (d.descriptor->>'bestStart')::float AS best_start, d.duration_sec,
      'tiktok' = ANY(a.tags) AS tiktok
    FROM blitz_assets a LEFT JOIN asset_descriptors d ON d.blitz_asset_id = a.id
    WHERE a.type = 'AUDIO' AND a.workspace_id IS NULL
    ORDER BY lower(a.name)`;

/** How far back a workspace's music counts as "used lately". */
const RECENT_MUSIC_DAYS = 14;

/**
 * Uses per track in the workspace lately, across every kind of content: slideshows (its runs and idea runs), Blitz
 * deck cards and calendar ideas, and Blitz videos on the calendar.
 */
const recentTrackUse = async (workspaceId: string | null): Promise<Map<string, number>> => {
  if (!workspaceId) return new Map();
  const since = new Date(Date.now() - RECENT_MUSIC_DAYS * 86_400_000);
  const rows = await prisma.$queryRaw<Array<{ id: string; uses: number }>>`
    SELECT id, count(*)::int AS uses FROM (
      SELECT s.audio_asset_id AS id FROM auto_slideshows s
        JOIN auto_slideshow_runs r ON r.id = s.run_id
        LEFT JOIN auto_slideshow_runs m ON m.id = r.idea_for_run_id
        WHERE coalesce(r.workspace_id, m.workspace_id) = ${workspaceId} AND s.created_at >= ${since} AND s.audio_asset_id IS NOT NULL
      UNION ALL
      SELECT a.id FROM slideshow_variants v JOIN blitz_assets a ON a.r2_key = v.plan->'audio'->>'assetKey'
        WHERE v.workspace_id = ${workspaceId} AND v.engine = 'website' AND v.created_at >= ${since}
      UNION ALL
      SELECT a.id FROM blitz_scheduled_posts p JOIN blitz_assets a ON a.r2_key = p.render_body->'currentAssets'->>'audioKey'
        WHERE p.workspace_id = ${workspaceId} AND p.created_at >= ${since}
    ) used GROUP BY id`;
  return new Map(rows.map((r) => [r.id, r.uses]));
};

export const listTracks = async (): Promise<AutoTrackDto[]> =>
  Promise.all(
    (await loadTracks()).map(async (t) => ({ assetId: t.id, name: t.name, url: await blitzBrowserUrl(t.r2_key), startAt: t.best_start ?? 0, durationSec: t.duration_sec, tiktok: t.tiktok })),
  );

export type MusicPick = { assetId: string; r2Key: string; name: string; startAt: number };

/**
 * Picks made in this process in the last minutes, per workspace. Slideshow ideas of one batch run in parallel, each its
 * own one-slideshow run, so none sees the others' music in the database yet; this counts them as used lately too.
 */
const JUST_PICKED_MS = 15 * 60_000;
const justPicked = new Map<string, Array<{ id: string; at: number }>>();

const withJustPicked = (workspaceId: string | null, recent: Map<string, number>): Map<string, number> => {
  if (!workspaceId) return recent;
  const fresh = (justPicked.get(workspaceId) ?? []).filter((p) => Date.now() - p.at < JUST_PICKED_MS);
  justPicked.set(workspaceId, fresh);
  const merged = new Map(recent);
  fresh.forEach((p) => merged.set(p.id, (merged.get(p.id) ?? 0) + 1));
  return merged;
};

const rememberPicks = (workspaceId: string | null, ids: string[]) => {
  if (!workspaceId) return;
  const at = Date.now();
  justPicked.set(workspaceId, [...(justPicked.get(workspaceId) ?? []), ...ids.map((id) => ({ id, at }))]);
};

/**
 * One track per piece of content (slideshow or Blitz card), the same way for both: a random pick among the TikTok sounds
 * the workspace used least lately, no repeat inside the batch while the library has enough. Empty when the library has no music.
 */
export const matchTracks = async (count: number, workspaceId: string | null): Promise<MusicPick[]> => {
  const tracks = await loadTracks();
  const tiktok = tracks.filter((t) => t.tiktok);
  const pool = tiktok.length > 0 ? tiktok : tracks;
  if (pool.length === 0 || count === 0) return [];

  const recent = await recentTrackUse(workspaceId).catch((err: unknown) => {
    console.warn('[music] recent tracks unreadable:', err instanceof Error ? err.message : err);
    return new Map<string, number>();
  });
  const used = new Set<string>();
  const ids = pool.map((t) => t.id);
  const lately = withJustPicked(workspaceId, recent);
  const picks = Array.from({ length: count }, (): MusicPick => {
    const id = chooseTrack({ pool: ids, recent: lately, used });
    const track = pool.find((t) => t.id === id)!;
    return { assetId: track.id, r2Key: track.r2_key, name: track.name, startAt: track.best_start ?? 0 };
  });
  rememberPicks(workspaceId, picks.map((p) => p.assetId));
  return picks;
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
