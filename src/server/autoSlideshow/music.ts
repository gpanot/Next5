// server-only — never import from a 'use client' file.
// Background music from the shared Assets Library (blitz_assets type AUDIO). One picker for every kind of content
// (Auto Slideshow slideshows, slideshow ideas, Blitz deck cards and calendar ideas): rights-safe described tracks,
// scored by Jev for fit, minus the ones the workspace used lately, random among the close best (see musicPick.ts).
// Changeable in the editor. For slideshows it is used for the preview and the ZIP; TikTok's photo API cannot attach it.

import { prisma } from '../../lib/db';
import type { AutoSlide, AutoTrackDto } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { isJevEnabled, jevScore } from '../ai/jev';
import { runPool } from '../pool';
import { chooseTrack } from './musicPick';

type MusicDescriptor = { vibe?: string[]; pacing?: string; energyLevel?: number; emotion?: string; sound?: string; imagery?: string; avoidFor?: string[] };
type TrackRow = { id: string; name: string; r2_key: string; best_start: number | null; duration_sec: number | null; descriptor: MusicDescriptor | null; pickable: boolean };

/**
 * Shared audio tracks, by name. The start point is the descriptor's best start when the track was described.
 * `pickable`: described music without high rights risk, the only tracks generation picks (the editor lists all).
 */
const loadTracks = () =>
  prisma.$queryRaw<TrackRow[]>`
    SELECT a.id, a.name, a.r2_key, (d.descriptor->>'bestStart')::float AS best_start, d.duration_sec, d.descriptor,
      coalesce(d.status = 'done' AND d.kind = 'music' AND d.effective_rights_risk <> 'high', false) AS pickable
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
  Promise.all((await loadTracks()).map(async (t) => ({ assetId: t.id, name: t.name, url: await blitzBrowserUrl(t.r2_key), startAt: t.best_start ?? 0, durationSec: t.duration_sec })));

/** `audience`: who this one slideshow is for, when it differs from the profile's (Blitz deck cards, one per audience). */
export type ShowForMusic = { goal: string | null; slides: Pick<AutoSlide, 'title' | 'body'>[]; audience?: string };
/** `recommended`: Jev scored the pick (false when Jev was unavailable and only recency and chance chose it). */
export type MusicPick = { assetId: string; r2Key: string; name: string; startAt: number; recommended: boolean };

const FIT_RUBRIC = ['Clashes with it', 'Weak fit', 'Okay', 'Good fit', 'Perfect fit'];
const FIT_QUESTION = 'How well does this background track match this TikTok photo slideshow: its mood, topic, audience and brand?';
/** Parallel Jev calls across all (slideshow, track) pairs. */
const JEV_CONCURRENCY = 24;

const trackState = (t: TrackRow) => {
  const d = t.descriptor ?? {};
  return { name: t.name, vibe: d.vibe, pacing: d.pacing, energy: d.energyLevel, emotion: d.emotion, sound: d.sound, goodFor: d.imagery, avoidFor: d.avoidFor };
};

/** Jev fit score (0..1) of every described track, per slideshow. A missing entry means that call failed. */
const scoreTracks = async (shows: ShowForMusic[], profile: BrandProfile | null, tracks: TrackRow[]): Promise<Map<string, number>[]> => {
  const business = profile ? { brand: profile.brandName, offer: profile.valueProp, audience: profile.audience, tone: profile.tone } : null;
  const scores = shows.map(() => new Map<string, number>());
  const pairs = shows.flatMap((show, i) => tracks.map((track) => ({ i, show, track })));
  await runPool(pairs, JEV_CONCURRENCY, async ({ i, show, track }) => {
    const slideshow = { business, goal: show.goal, ...(show.audience ? { audience: show.audience } : {}), slides: show.slides.map((s) => `${s.title} ${s.body}`.trim()) };
    const s = await jevScore({ slideshow, track: trackState(track) }, FIT_QUESTION, FIT_RUBRIC);
    if (s !== null) scores[i]!.set(track.id, s);
  });
  return scores;
};

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
 * One track per piece of content (slideshow or Blitz card), the same way for both: Jev's fit for this content, fewer
 * points for tracks the workspace used lately, no repeat inside the batch while the library has enough, then a random
 * pick among the close best. Without Jev, recency and chance alone choose. Empty when the library has no music.
 */
export const matchTracks = async (shows: ShowForMusic[], profile: BrandProfile | null, workspaceId: string | null): Promise<MusicPick[]> => {
  const tracks = await loadTracks();
  const pickable = tracks.filter((t) => t.pickable);
  const pool = pickable.length > 0 ? pickable : tracks;
  if (pool.length === 0 || shows.length === 0) return [];

  const [scores, recent] = await Promise.all([
    isJevEnabled() && pickable.length > 0 ? scoreTracks(shows, profile, pickable) : Promise.resolve(shows.map(() => new Map<string, number>())),
    recentTrackUse(workspaceId).catch((err: unknown) => {
      console.warn('[music] recent tracks unreadable:', err instanceof Error ? err.message : err);
      return new Map<string, number>();
    }),
  ]);
  const used = new Set<string>();
  const ids = pool.map((t) => t.id);
  const lately = withJustPicked(workspaceId, recent);
  const picks = shows.map((_, i): MusicPick => {
    const fit = scores[i]!;
    const id = chooseTrack({ pool: ids, fit, recent: lately, used });
    const track = pool.find((t) => t.id === id)!;
    return { assetId: track.id, r2Key: track.r2_key, name: track.name, startAt: track.best_start ?? 0, recommended: fit.size > 0 };
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
