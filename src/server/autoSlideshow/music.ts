// server-only — never import from a 'use client' file.
// Background music from the shared Assets Library (blitz_assets type AUDIO): at generation Jev picks the best-matching
// track per slideshow (random when Jev is unavailable), changeable in the editor. Used for the preview and the ZIP;
// TikTok's photo API cannot attach it.

import { prisma } from '../../lib/db';
import type { AutoSlide, AutoTrackDto } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { isJevEnabled, jevScore } from '../ai/jev';
import { runPool } from '../pool';

type MusicDescriptor = { vibe?: string[]; pacing?: string; energyLevel?: number; emotion?: string; sound?: string; imagery?: string; avoidFor?: string[] };
type TrackRow = { id: string; name: string; r2_key: string; best_start: number | null; descriptor: MusicDescriptor | null };

/** Shared audio tracks, by name. The start point is the descriptor's best start when the track was described. */
const loadTracks = () =>
  prisma.$queryRaw<TrackRow[]>`
    SELECT a.id, a.name, a.r2_key, (d.descriptor->>'bestStart')::float AS best_start, d.descriptor
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

/** `audience`: who this one slideshow is for, when it differs from the profile's (Blitz deck cards, one per audience). */
export type ShowForMusic = { goal: string | null; slides: Pick<AutoSlide, 'title' | 'body'>[]; audience?: string };
export type MusicPick = { assetId: string; startAt: number; recommended: boolean };

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
 * One track per slideshow: Jev's best-matching described track not already used in this batch (so a set does not
 * all share one song), flagged `recommended`. Falls back to random tracks when Jev or descriptors are unavailable.
 */
export const matchTracks = async (shows: ShowForMusic[], profile: BrandProfile | null): Promise<MusicPick[]> => {
  const tracks = await loadTracks();
  const described = tracks.filter((t) => t.descriptor);
  const random = await pickTracks(shows.length);
  if (!isJevEnabled() || described.length === 0 || shows.length === 0) return random.map((t) => ({ ...t, recommended: false }));

  const scores = await scoreTracks(shows, profile, described);
  const used = new Set<string>();
  return shows.map((_, i) => {
    const ranked = [...scores[i]!].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    if (ranked.length === 0) return { ...random[i]!, recommended: false };
    if (ranked.every((id) => used.has(id))) used.clear();
    const best = described.find((t) => t.id === ranked.find((id) => !used.has(id)))!;
    used.add(best.id);
    return { assetId: best.id, startAt: best.best_start ?? 0, recommended: true };
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
