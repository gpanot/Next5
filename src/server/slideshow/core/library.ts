// server-only — never import from a 'use client' file.
// Asset library retrieval over asset_descriptors: hook clips, memes, backgrounds, music.
//
// Ranking blends what the descriptor pipeline measured for every asset:
//   slot score (how well it plays this role) + niche fit + meaning match between the shot and the
//   asset + energy fit + a per-kind boost the engine sets (e.g. memes for Pain) − a penalty when
//   the asset's own avoidFor matches the role.
// Meaning match: cosine similarity on pgvector embeddings when the query was embedded
// (embedQueries); otherwise Postgres full-text rank over retrievalText / meaning / bestUse.
// A little random jitter keeps two decks for the same listing from looking identical.
//
// All values go through Prisma.sql parameters: shot text comes from an LLM and is never interpolated.

import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import { toVectorLiteral } from '../../ai/embeddings';
import { blitzBrowserUrl } from '../../admin/blitzStore';
import { contentWords } from './copyGuards';

export type LibraryKind = 'hook' | 'meme' | 'background';

export type SlotColumn = 'slot_hook' | 'slot_problem' | 'slot_proof' | 'slot_payoff' | 'slot_cta';

export type LibraryQuery = {
  slot: SlotColumn;
  /** Kinds allowed for this shot, each with a score boost (0 = allowed, no preference). */
  kinds: Partial<Record<LibraryKind, number>>;
  /** Shot line plus any extra intent words ("shocked reaction"). */
  text: string;
  /** Minimum slot score. */
  minSlot: number;
  /** Target energy 0–1 from the brief's tone or angle. */
  targetEnergy: number;
  /** Niche fit column; null = no niche preference. */
  niche: 'niche_realtor' | 'niche_tiktok_shop' | null;
  /** Regex over the asset's avoidFor; a match costs score (the asset says "not for this"). */
  avoidPattern?: string;
  /** Asset ids already used in this deck. */
  excludeIds?: string[];
  workspaceId?: string | null;
  limit?: number;
  /** Embedding of `text` (embedQueries). Absent = keyword ranking. */
  embedding?: number[] | null;
  /**
   * Industry categories of the audience (core/categories.ts).
   * 'require' = only assets tagged with one of them; 'boost' = tagged assets rank higher.
   */
  categories?: string[];
  categoryMode?: 'require' | 'boost';
};

export type LibraryAsset = {
  assetId: string;
  kind: LibraryKind;
  r2Key: string;
  name: string;
  /** Best window from the descriptor (seconds). */
  trimStart: number;
  trimEnd: number;
  /** 'top_third' | 'center' | 'bottom_third' */
  textSafeZone: string;
  retrievalText: string;
  score: number;
  /** Cosine similarity between the shot and the asset (0 when searched by keywords). */
  similarity: number;
  categories: string[];
};

/** Profanity or crude gestures in the description or transcript: never shown to a brand's audience. */
const UNSAFE_CONTENT =
  '\\m(fuck\\w*|shit\\w*|bitch\\w*|damn|dick|cunt|asshole|middle finger|obscen\\w*|vulgar|explicit|nud\\w+|sexual\\w*|weapon\\w*|guns?|drunk|drugs?)\\M';

/** Caption position (TextConfig.positionY: bottom edge of the caption) for each text-safe zone. */
export const SAFE_ZONE_POSITION_Y: Record<string, number> = {
  top_third: 0.3,
  center: 0.58,
  bottom_third: 0.85,
};

/** OR-query of the line's content words, prefix-matched: "kitchen | cramp:* | cook:*". */
function toTsQuery(text: string): string {
  return [...contentWords(text)]
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter((w) => w.length >= 3)
    .slice(0, 14)
    .map((w) => `${w}:*`)
    .join(' | ');
}

type Row = {
  asset_id: string;
  kind: LibraryKind;
  r2_key: string;
  name: string;
  trim_start: number | null;
  trim_end: number | null;
  text_safe_zone: string;
  retrieval_text: string | null;
  score: number;
  similarity: number;
  categories: string[] | null;
};

/** Cosine similarity (text-embedding-3-small lands ~0.2–0.6 for related text), scaled to weigh most. */
const vectorMatch = (embedding: number[]) =>
  Prisma.sql`coalesce(1 - (d.embedding <=> ${toVectorLiteral(embedding)}::vector), 0) * 1.2`;

/** Full-text fallback: prefix OR-match of the line's content words. Slower (no index) and literal. */
function keywordMatch(text: string) {
  const tsq = toTsQuery(text);
  if (!tsq) return Prisma.sql`0`;
  const doc = Prisma.sql`to_tsvector('english', coalesce(d.retrieval_text,'') || ' ' || coalesce(d.descriptor->>'meaning','') || ' ' || coalesce(d.descriptor->>'bestUse',''))`;
  return Prisma.sql`LEAST(ts_rank_cd(${doc}, to_tsquery('english', ${tsq})), 1) * 0.6`;
}

/** Ranked library assets for one shot. Empty when nothing passes the rights / safety filters. */
export async function searchLibrary(q: LibraryQuery): Promise<LibraryAsset[]> {
  const kinds = Object.keys(q.kinds) as LibraryKind[];
  if (kinds.length === 0) return [];
  const boost = (k: LibraryKind) => q.kinds[k] ?? 0;
  const slot = Prisma.raw(`d.${q.slot}`); // whitelisted by the SlotColumn type
  const niche = q.niche ? Prisma.raw(`coalesce(d.${q.niche}, 0.5)`) : Prisma.raw('0.5');
  const meaningMatch = q.embedding ? vectorMatch(q.embedding) : keywordMatch(q.text);
  const similarity = q.embedding
    ? Prisma.sql`coalesce(1 - (d.embedding <=> ${toVectorLiteral(q.embedding)}::vector), 0)`
    : Prisma.sql`0`;
  const cats = q.categories ?? [];
  const categoryBoost = cats.length && q.categoryMode === 'boost'
    ? Prisma.sql`CASE WHEN d.categories && ${cats}::text[] THEN 0.3 ELSE 0 END`
    : Prisma.sql`0`;
  const categoryFilter = cats.length && q.categoryMode === 'require'
    ? Prisma.sql`AND d.categories && ${cats}::text[]`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT a.id AS asset_id, d.kind, a.r2_key, a.name,
      (d.descriptor->'bestTrim'->>'start')::float AS trim_start,
      (d.descriptor->'bestTrim'->>'end')::float   AS trim_end,
      d.text_safe_zone, d.retrieval_text, d.categories,
      ${similarity}::float AS similarity,
      ( ${slot} * 0.45
        + ${categoryBoost}
        + ${niche} * 0.2
        + ${meaningMatch}
        + (1 - abs(coalesce(d.energy_level, 0.5) - ${q.targetEnergy}::float)) * 0.1
        + CASE d.kind WHEN 'hook' THEN ${boost('hook')}::float WHEN 'meme' THEN ${boost('meme')}::float ELSE ${boost('background')}::float END
        - CASE WHEN ${q.avoidPattern ?? ''}::text <> '' AND array_to_string(d.avoid_for, ' ') ~* ${q.avoidPattern ?? ''}::text THEN 0.15 ELSE 0 END
        + random() * 0.06
      )::float AS score
    FROM asset_descriptors d
    JOIN blitz_assets a ON a.id = d.blitz_asset_id
    WHERE d.status = 'done'
      AND d.kind = ANY(${kinds}::text[])
      AND ${slot} >= ${q.minSlot}::float
      AND d.effective_rights_risk <> 'high'
      AND coalesce(d.text_safe_zone, 'none') <> 'none'
      AND coalesce(d.identifiable_person, true) = false
      AND coalesce(d.public_figure_likely, false) = false
      AND (a.workspace_id IS NULL OR a.workspace_id = ${q.workspaceId ?? null}::text)
      AND NOT ((coalesce(d.retrieval_text,'') || ' ' || coalesce(d.descriptor->>'transcript','')) ~* ${UNSAFE_CONTENT})
      AND NOT (a.id = ANY(${q.excludeIds ?? []}::text[]))
      ${categoryFilter}
    ORDER BY score DESC
    LIMIT ${q.limit ?? 5}`;

  return rows.map((r) => ({
    assetId: r.asset_id,
    kind: r.kind,
    r2Key: r.r2_key,
    name: r.name,
    trimStart: r.trim_start ?? 0,
    trimEnd: r.trim_end ?? (r.trim_start ?? 0) + 4,
    textSafeZone: r.text_safe_zone,
    retrievalText: r.retrieval_text ?? '',
    score: Number(r.score),
    similarity: Number(r.similarity),
    categories: r.categories ?? [],
  }));
}

// ── Music ─────────────────────────────────────────────────────────────────────

export type LibraryTrack = { assetId: string; r2Key: string; url: string; name: string; startAt: number };

/**
 * Up to `limit` described music tracks that are safe to publish, ranked by niche fit and energy.
 * Undescribed tracks are never returned: their rights risk is unknown.
 */
export async function searchMusic(targetEnergy: number, limit = 3): Promise<LibraryTrack[]> {
  const rows = await prisma.$queryRaw<Array<{ asset_id: string; r2_key: string; name: string; best_start: number | null }>>`
    SELECT a.id AS asset_id, a.r2_key, a.name, (d.descriptor->>'bestStart')::float AS best_start
    FROM asset_descriptors d
    JOIN blitz_assets a ON a.id = d.blitz_asset_id
    WHERE d.status = 'done' AND d.kind = 'music' AND d.effective_rights_risk <> 'high'
    ORDER BY coalesce(d.niche_realtor, 0.5) + (1 - abs(coalesce(d.energy_level, 0.5) - ${targetEnergy}::float)) DESC
    LIMIT ${limit}`;
  return Promise.all(rows.map(async (r) => ({
    assetId: r.asset_id, r2Key: r.r2_key, url: await blitzBrowserUrl(r.r2_key), name: r.name, startAt: r.best_start ?? 0,
  })));
}

/** First clause of the asset's description, for card labels: "Meme · An elderly woman bursts into sobbing". */
export function assetLabel(asset: LibraryAsset): string {
  const isImage = /\.(jpe?g|png|webp|avif)$/i.test(asset.r2Key);
  const kindLabel = asset.kind === 'hook' ? 'Hook clip' : asset.kind === 'meme' ? 'Meme' : isImage ? 'Image' : 'B-roll';
  const first = asset.retrievalText.split(/(?<=\.)\s/)[0]?.replace(/\.$/, '') ?? asset.name;
  return `${kindLabel} · ${first.length > 90 ? `${first.slice(0, 87)}…` : first}`;
}
