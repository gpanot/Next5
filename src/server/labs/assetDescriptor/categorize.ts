// server-only — industry categories for described assets (see slideshow/core/categories.ts).
//
// One gpt-4o-mini call classifies up to 40 assets from their description. Results go to
// asset_descriptors.categories (filter column), the descriptor JSON, and blitz_assets.tags,
// so they show in the library, drive engine search, and are part of the embedded text.

import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import { chatJson } from '../../ai/openai';
import { CATEGORY_SLUGS, categoryLabel, categoryMenu, cleanCategories } from '../../slideshow/core/categories';

const BATCH = 40;

const SYSTEM = `You tag short video clips and images for a social-video library by INDUSTRY.
For each asset, pick 1 to 3 categories from this list (slugs only):
${categoryMenu()}

Rules:
- Tag what the footage SHOWS, not who could use it. An electrician on a ladder = electricians (+ home_services).
- Reaction memes, a person talking to camera, plain emotions or generic lifestyle = general.
- A clip can be general plus an industry if it clearly shows one (a woman talking in a gym = general, fitness).
- Never invent a category that is not in the list.

Return JSON only: { "items": [ { "id": "<asset id>", "categories": ["slug", ...] } ] }`;

export type CategorizeRow = { id: string; kind: string; retrieval_text: string | null; descriptor: unknown };

function assetLine(r: CategorizeRow): string {
  const d = (r.descriptor ?? {}) as { meaning?: string; subject?: string; setting?: string; action?: string };
  return `${r.id} [${r.kind}] ${r.retrieval_text ?? ''} Subject: ${d.subject ?? '-'}. Setting: ${d.setting ?? '-'}. Action: ${d.action ?? '-'}.`;
}

/** Classifies rows (≤ 40 per call). Rows the model skipped fall back to ['general']. */
export async function classifyRows(rows: CategorizeRow[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await chatJson<{ items?: Array<{ id?: string; categories?: unknown }> }>(
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: batch.map(assetLine).join('\n') },
      ],
      { maxTokens: 3_000, temperature: 0, timeoutMs: 60_000 },
    );
    const byId = new Map((result?.items ?? []).map((it) => [it.id, cleanCategories(it.categories)]));
    batch.forEach((r) => {
      const cats = byId.get(r.id);
      out.set(r.id, cats && cats.length ? cats : ['general']);
    });
  }
  return out;
}

/** Writes categories to the descriptor (column + JSON) and merges their labels into the asset's tags. */
export async function saveCategories(descriptorId: string, categories: string[]): Promise<void> {
  const labels = categories.map(categoryLabel);
  const allLabels = CATEGORY_SLUGS.map(categoryLabel);
  await prisma.$executeRaw`
    UPDATE asset_descriptors
    SET categories = ${categories}::text[],
        descriptor = jsonb_set(coalesce(descriptor, '{}'::jsonb), '{categories}', ${JSON.stringify(categories)}::jsonb)
    WHERE id = ${descriptorId}`;
  // Replace old category labels, keep every other tag.
  await prisma.$executeRaw`
    UPDATE blitz_assets a
    SET tags = ARRAY(SELECT DISTINCT t FROM unnest(
      array(SELECT x FROM unnest(a.tags) x WHERE NOT (x = ANY(${allLabels}::text[]))) || ${labels}::text[]
    ) t)
    FROM asset_descriptors d
    WHERE d.id = ${descriptorId} AND d.blitz_asset_id = a.id`;
}

/** Classifies one freshly described asset. Best-effort: search still works without categories. */
export async function refreshDescriptorCategories(where: { blitzAssetId: string } | { ugcVideoId: string }): Promise<void> {
  try {
    const column = 'blitzAssetId' in where ? Prisma.raw('blitz_asset_id') : Prisma.raw('ugc_video_id');
    const value = 'blitzAssetId' in where ? where.blitzAssetId : where.ugcVideoId;
    const rows = await prisma.$queryRaw<CategorizeRow[]>`
      SELECT id, kind, retrieval_text, descriptor FROM asset_descriptors WHERE ${column} = ${value} AND status = 'done'`;
    const cats = await classifyRows(rows);
    for (const [id, c] of cats) await saveCategories(id, c);
  } catch (err) {
    console.error('[assetDescriptor] category refresh failed:', err);
  }
}
