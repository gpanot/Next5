// server-only — embeddings for asset descriptors (semantic search in the slideshow engines).
//
// The embedded document is what the engine searches with: the one-line retrieval text plus the
// descriptor's meaning, best use, subject, action, setting and vibe. Written after every describe
// (db.ts) and backfilled by scripts/embed-asset-descriptors.ts.

import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import { embedTexts, toVectorLiteral } from '../../ai/embeddings';
import { categoryLabel } from '../../slideshow/core/categories';

type DescriptorJson = {
  meaning?: string;
  bestUse?: string;
  subject?: string;
  action?: string;
  setting?: string;
  vibe?: string[];
  emotion?: { face?: string; arc?: string } | string;
  imagery?: string;
  sound?: string;
  categories?: string[];
};

/** The text that represents one asset in vector space. */
export function descriptorDocText(kind: string, retrievalText: string | null, descriptor: unknown): string {
  const d = (descriptor ?? {}) as DescriptorJson;
  const emotion = typeof d.emotion === 'string' ? d.emotion : [d.emotion?.face, d.emotion?.arc].filter(Boolean).join(', ');
  return [
    `${kind}.`,
    retrievalText,
    d.meaning,
    d.bestUse,
    [d.subject, d.action, d.setting].filter(Boolean).join('; '),
    emotion,
    d.imagery,
    d.sound,
    d.vibe?.length ? `Vibe: ${d.vibe.join(', ')}` : null,
    d.categories?.length ? `Industries: ${d.categories.map(categoryLabel).join(', ')}` : null,
  ].filter(Boolean).join('\n');
}

let columnReady: boolean | null = null;

/** True once the pgvector migration has run (checked once per process). */
export async function embeddingColumnReady(): Promise<boolean> {
  if (columnReady !== null) return columnReady;
  const rows = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_name = 'asset_descriptors' AND column_name = 'embedding'`;
  columnReady = (rows[0]?.n ?? 0) > 0;
  return columnReady;
}

type Row = { id: string; kind: string; retrieval_text: string | null; descriptor: unknown };

/** Embeds the given descriptor rows and stores the vectors. Returns how many were written. */
export async function embedDescriptorRows(rows: Row[]): Promise<number> {
  if (rows.length === 0 || !(await embeddingColumnReady())) return 0;
  const vectors = await embedTexts(rows.map((r) => descriptorDocText(r.kind, r.retrieval_text, r.descriptor)));
  if (!vectors) return 0;
  for (let i = 0; i < rows.length; i++) {
    await prisma.$executeRaw`
      UPDATE asset_descriptors SET embedding = ${toVectorLiteral(vectors[i]!)}::vector WHERE id = ${rows[i]!.id}`;
  }
  return rows.length;
}

/** Re-embeds one descriptor after it was (re)described. Best-effort: search falls back to keywords. */
export async function refreshDescriptorEmbedding(where: { blitzAssetId: string } | { ugcVideoId: string }): Promise<void> {
  try {
    const column = 'blitzAssetId' in where ? Prisma.raw('blitz_asset_id') : Prisma.raw('ugc_video_id');
    const value = 'blitzAssetId' in where ? where.blitzAssetId : where.ugcVideoId;
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT id, kind, retrieval_text, descriptor FROM asset_descriptors WHERE ${column} = ${value} AND status = 'done'`;
    await embedDescriptorRows(rows);
  } catch (err) {
    console.error('[assetDescriptor] embedding refresh failed:', err);
  }
}
