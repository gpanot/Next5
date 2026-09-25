// server-only — candidate assets for "Remix it!" (see blitzRemix.ts).
//
// Locked layers: only the current asset goes in the catalog, so the model knows what it is.
// Unlocked layers: the closest assets to the locked layers in vector space (pgvector cosine on
// asset_descriptors.embedding), topped up with random picks so the remix can still surprise.
// Without embeddings (no column, no OpenAI key, nothing locked to match against) it is all random.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { embedQueries, toVectorLiteral } from '../ai/embeddings';
import { embeddingColumnReady } from './assetDescriptor/embedding';

export type AssetType = 'OVERLAY' | 'BACKGROUND' | 'AUDIO';

export type Candidate = { alias: string; r2Key: string; type: AssetType; line: string; fit: number | null };

const CAPS: Record<AssetType, number> = { OVERLAY: 40, BACKGROUND: 30, AUDIO: 25 };
/** Share of each unlocked layer's slots filled by vector matches; the rest is random. */
const VECTOR_SHARE = 0.6;
const ALIAS_PREFIX: Record<AssetType, string> = { OVERLAY: 'm', BACKGROUND: 'b', AUDIO: 'a' };
const TYPES: AssetType[] = ['OVERLAY', 'BACKGROUND', 'AUDIO'];

type DescriptorJson = {
  meaning?: string;
  vibe?: string[];
  transcript?: string | null;
  hasSpeech?: boolean;
  energyLevel?: number;
  sound?: string;
};

type AssetRow = {
  name: string;
  type: string;
  r2Key: string;
  descriptor: { status: string; retrievalText: string | null; descriptor: unknown; effectiveRightsRisk: string | null } | null;
};

export const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

const summaryOf = (row: AssetRow) => {
  const done = row.descriptor?.status === 'done' ? row.descriptor : null;
  const d = (done?.descriptor ?? {}) as DescriptorJson;
  return { d, text: done?.retrievalText || d.meaning || d.sound || row.name };
};

/** One catalog line: what the asset is, its vibe, energy, what the meme says, and its vector fit. */
function describeLine(row: AssetRow, fit: number | null): string {
  const { d, text } = summaryOf(row);
  return [
    clip(text, 200),
    d.vibe?.length ? `vibe: ${d.vibe.slice(0, 4).join(', ')}` : null,
    typeof d.energyLevel === 'number' ? `energy ${d.energyLevel.toFixed(1)}` : null,
    d.hasSpeech && d.transcript ? `says: "${clip(d.transcript, 140)}"` : null,
    fit !== null ? `fit ${fit.toFixed(2)}` : null,
  ].filter(Boolean).join(' | ');
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Cosine similarity of every embedded blitz asset to the query vector, keyed by r2Key. */
async function similarities(queryText: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!queryText.trim() || !(await embeddingColumnReady())) return out;
  const [vector] = await embedQueries([queryText]);
  if (!vector) return out;
  const rows = await prisma.$queryRaw<Array<{ r2_key: string; sim: number }>>(Prisma.sql`
    SELECT a.r2_key, (1 - (d.embedding <=> ${toVectorLiteral(vector)}::vector))::float AS sim
    FROM asset_descriptors d JOIN blitz_assets a ON a.id = d.blitz_asset_id
    WHERE d.status = 'done' AND d.embedding IS NOT NULL
      AND a.type IN ('OVERLAY', 'BACKGROUND', 'AUDIO')`);
  for (const r of rows) out.set(r.r2_key, Number(r.sim));
  return out;
}

/** What the unlocked layers should match: the locked caption and the locked assets' meaning. */
function lockedQueryText(rows: AssetRow[], lockedKeys: Set<string>, lockedCaption: string | null): string {
  const parts = rows.filter((r) => lockedKeys.has(r.r2Key)).map((r) => summaryOf(r).text);
  if (lockedCaption?.trim()) parts.unshift(`Caption: ${lockedCaption.trim()}`);
  return parts.join('\n');
}

/** Top vector matches first, then random picks; the current asset is always included. */
function pickForType(pool: AssetRow[], cap: number, sims: Map<string, number>, currentKey?: string): AssetRow[] {
  const current = pool.filter((r) => r.r2Key === currentKey);
  const rest = pool.filter((r) => r.r2Key !== currentKey);
  const byFit = rest.filter((r) => sims.has(r.r2Key)).sort((x, y) => sims.get(y.r2Key)! - sims.get(x.r2Key)!);
  const top = sims.size > 0 ? byFit.slice(0, Math.round(cap * VECTOR_SHARE)) : [];
  const topKeys = new Set(top.map((r) => r.r2Key));
  const random = shuffle(rest.filter((r) => !topKeys.has(r.r2Key)))
    .sort((x, y) => Number(y.descriptor?.status === 'done') - Number(x.descriptor?.status === 'done'));
  return [...current, ...top, ...random].slice(0, cap);
}

export type CandidateQuery = {
  currentKeys: Record<AssetType, string | undefined>;
  lockedTypes: Set<AssetType>;
  lockedCaption: string | null;
};

/** Catalog for the model: locked layers show only their current asset, unlocked layers a ranked pool. */
export async function loadCandidates(q: CandidateQuery): Promise<{ cands: Candidate[]; usedVectors: boolean }> {
  const rows: AssetRow[] = await prisma.blitzAsset.findMany({
    where: { type: { in: TYPES } },
    select: {
      name: true, type: true, r2Key: true,
      descriptor: { select: { status: true, retrievalText: true, descriptor: true, effectiveRightsRisk: true } },
    },
  });
  const current = new Set(Object.values(q.currentKeys).filter((k): k is string => Boolean(k)));
  const lockedKeys = new Set([...q.lockedTypes].map((t) => q.currentKeys[t]).filter((k): k is string => Boolean(k)));
  const sims = await similarities(lockedQueryText(rows, lockedKeys, q.lockedCaption)).catch(() => new Map<string, number>());

  const cands: Candidate[] = [];
  for (const type of TYPES) {
    const pool = rows.filter((r) => r.type === type && (current.has(r.r2Key) || r.descriptor?.effectiveRightsRisk !== 'high'));
    const picked = q.lockedTypes.has(type)
      ? pool.filter((r) => r.r2Key === q.currentKeys[type])
      : pickForType(pool, CAPS[type], sims, q.currentKeys[type]);
    picked.forEach((row, i) => {
      const fit = sims.get(row.r2Key) ?? null;
      cands.push({ alias: `${ALIAS_PREFIX[type]}${i + 1}`, r2Key: row.r2Key, type, line: describeLine(row, fit), fit });
    });
  }
  return { cands, usedVectors: sims.size > 0 };
}
