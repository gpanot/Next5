// server-only — shared media direction for both engines.
//
// Engines describe WHAT each shot needs (a LibraryRule per role / hook archetype). This module
// runs the searches — all query texts embedded in one call when vector search is live — and turns
// ranked assets into shot media with runner-ups for the editor's one-tap swap.

import { prisma } from '../../../lib/db';
import { embedQueries } from '../../ai/embeddings';
import { blitzBrowserUrl } from '../../admin/blitzStore';
import { embeddingColumnReady } from '../../labs/assetDescriptor/embedding';
import { SAFE_ZONE_POSITION_Y, assetLabel, clipKey, searchLibrary, type LibraryAsset, type LibraryQuery } from './library';
import type { HookArchetype } from './types';

// ── Output shape (JSON-safe, sent to the deck) ───────────────────────────────

export type MediaOption = {
  mediaUrl: string;
  mediaKind: 'image' | 'video';
  mediaLabel: string;
  /** Library asset (already in R2). Absent for listing photos, which the editor imports. */
  assetId?: string;
  assetKey?: string;
  trimStart?: number;
  /** Caption position from the asset's text-safe zone. */
  positionY?: number;
};

export type ShotMedia = MediaOption & {
  source: 'library' | 'listing';
  /** Listing photo tag, used by the editor's photo import ('library' for library clips). */
  photoTag: string;
  alternatives: MediaOption[];
};

// ── Rules ─────────────────────────────────────────────────────────────────────

export type LibraryRule = Pick<LibraryQuery, 'slot' | 'kinds' | 'minSlot' | 'avoidPattern'> & {
  /** Visual intent words added to the shot line ("shocked reaction"). */
  intent: string;
};

/** Assets that say "avoid for negative / stressful topics" should not illustrate a pain. */
export const AVOID_ON_PROBLEM = 'negative|stressful|problem';

/** Hook media per archetype (spec 7.5). 'hero' = the engine's own hero visual leads (Result first). */
export const HOOK_RULES: Record<HookArchetype, LibraryRule | 'hero'> = {
  call_out: { slot: 'slot_hook', kinds: { hook: 0.2 }, minSlot: 0.65, intent: 'person talking to camera pointing, direct address' },
  contrarian: { slot: 'slot_hook', kinds: { hook: 0.2, background: 0.02 }, minSlot: 0.3, intent: 'skeptical, disagreeing, unimpressed reaction' },
  proof_result: 'hero',
  fear_inaction: { slot: 'slot_problem', kinds: { hook: 0.1, background: 0.05 }, minSlot: 0.5, intent: 'shocked, worried, sudden realization' },
  curiosity: { slot: 'slot_hook', kinds: { hook: 0.2 }, minSlot: 0.65, intent: 'surprised reveal, wait for it, curious' },
  action: { slot: 'slot_hook', kinds: { hook: 0.2 }, minSlot: 0.65, intent: 'pointing at viewer, talking to camera, share this' },
};

/** A 'hero' hook falls back to call-out style clips for its swap row. */
export const hookRule = (a: HookArchetype): LibraryRule => {
  const rule = HOOK_RULES[a];
  return rule === 'hero' ? (HOOK_RULES.call_out as LibraryRule) : rule;
};

// ── Search ────────────────────────────────────────────────────────────────────

export type ShotQuery = {
  rule: LibraryRule;
  text: string;
  limit: number;
  excludeIds?: string[];
  /** Audience industries; see LibraryQuery.categoryMode. */
  categories?: string[];
  categoryMode?: 'require' | 'boost';
};
export type SearchContext = Pick<LibraryQuery, 'targetEnergy' | 'niche' | 'workspaceId'>;

let vectorLive: boolean | null = null;

/** Vector search is on once the column exists and the backfill has run (checked once per process). */
async function vectorSearchLive(): Promise<boolean> {
  if (vectorLive !== null) return vectorLive;
  if (!(await embeddingColumnReady())) return (vectorLive = false);
  const rows = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM asset_descriptors WHERE embedding IS NOT NULL`;
  vectorLive = (rows[0]?.n ?? 0) > 0;
  return vectorLive;
}

/** Runs many shot searches: one embeddings call for all query texts, then parallel SQL. */
export async function searchShots(ctx: SearchContext, queries: ShotQuery[]): Promise<LibraryAsset[][]> {
  const texts = queries.map((q) => `${q.text}. Visual: ${q.rule.intent}`);
  const vectors = (await vectorSearchLive()) ? await embedQueries(texts) : texts.map(() => null);
  return Promise.all(queries.map((q, i) => searchLibrary({
    ...ctx,
    slot: q.rule.slot,
    kinds: q.rule.kinds,
    minSlot: q.rule.minSlot,
    avoidPattern: q.rule.avoidPattern,
    text: texts[i]!,
    embedding: vectors[i],
    limit: q.limit,
    excludeIds: q.excludeIds,
    categories: q.categories,
    categoryMode: q.categoryMode,
  })));
}

// ── Shot media builders ───────────────────────────────────────────────────────

const isImageKey = (key: string) => /\.(jpe?g|png|webp|avif)$/i.test(key);

/** Library asset → media option. The URL fragment makes video previews start at the best moment. */
export async function libraryOption(a: LibraryAsset): Promise<MediaOption> {
  const url = await blitzBrowserUrl(a.r2Key);
  if (isImageKey(a.r2Key)) {
    return {
      mediaUrl: url,
      mediaKind: 'image',
      mediaLabel: assetLabel(a),
      assetId: a.assetId,
      assetKey: a.r2Key,
      positionY: SAFE_ZONE_POSITION_Y[a.textSafeZone],
    };
  }
  return {
    mediaUrl: `${url}#t=${a.trimStart},${a.trimEnd}`,
    mediaKind: 'video',
    mediaLabel: assetLabel(a),
    assetId: a.assetId,
    assetKey: a.r2Key,
    trimStart: a.trimStart,
    positionY: SAFE_ZONE_POSITION_Y[a.textSafeZone],
  };
}

/** Top asset as the shot, the next 4 as swaps. Null when the search found nothing. */
export async function libraryShot(ranked: LibraryAsset[]): Promise<ShotMedia | null> {
  const [primary, ...rest] = ranked;
  if (!primary) return null;
  return {
    ...(await libraryOption(primary)),
    source: 'library',
    photoTag: 'library',
    alternatives: await Promise.all(rest.slice(0, 4).map(libraryOption)),
  };
}

/**
 * The ranking without files already in this deck (`used`, by clipKey), with files the workspace showed recently
 * (`recent`) moved to the end: fresh footage first, a recent clip only when nothing else fits.
 */
export const freshFirst = (ranked: LibraryAsset[], used: Set<string>, recent?: Set<string>): LibraryAsset[] => {
  const unused = ranked.filter((a) => !used.has(clipKey(a.r2Key)));
  if (!recent?.size) return unused;
  return [...unused.filter((a) => !recent.has(clipKey(a.r2Key))), ...unused.filter((a) => recent.has(clipKey(a.r2Key)))];
};

/** Claims the shot's file for the deck, so no other shot shows it. */
export const claim = (used: Set<string>, shot: Pick<MediaOption, 'assetKey'> | null | undefined) => {
  if (shot?.assetKey) used.add(clipKey(shot.assetKey));
};

/**
 * One hook shot per card, never reusing a file already in the deck (`used`: clipKeys), and leaving files the workspace
 * showed recently (`recent`) for last. `hero` builds the Result-first shot (listing photo, product screenshot…) with
 * library swaps.
 */
export async function directHooks(
  archetypes: HookArchetype[],
  ranked: LibraryAsset[][],
  used: Set<string>,
  hero: (swaps: MediaOption[]) => ShotMedia | null,
  recent?: Set<string>,
): Promise<ShotMedia[]> {
  const out: ShotMedia[] = [];
  for (let i = 0; i < archetypes.length; i++) {
    const fresh = freshFirst(ranked[i] ?? [], used, recent);
    const swaps = () => Promise.all(fresh.slice(0, 4).map(libraryOption));
    const heroShot = HOOK_RULES[archetypes[i]!] === 'hero' ? hero(await swaps()) : null;
    const shot = heroShot ?? (await libraryShot(fresh));
    claim(used, shot);
    out.push(shot ?? hero([]) ?? emptyShot());
  }
  return out;
}

/** No media found anywhere: the editor shows "Pick background". */
export const emptyShot = (): ShotMedia => ({
  source: 'library', mediaUrl: '', mediaKind: 'image', mediaLabel: 'Pick a background', photoTag: 'library', alternatives: [],
});
