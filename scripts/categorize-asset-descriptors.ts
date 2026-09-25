/**
 * Backfill industry categories for described assets, then re-embed them (categories are part of
 * the embedded text).
 *
 *   npx tsx --env-file=.env.local scripts/categorize-asset-descriptors.ts          # only uncategorized
 *   npx tsx --env-file=.env.local scripts/categorize-asset-descriptors.ts --all    # everything
 *
 * Needs migration 20261014110000_asset_descriptor_categories.sql. Cost: ~45 gpt-4o-mini calls.
 */
import { prisma } from '../src/lib/db';
import { classifyRows, saveCategories, type CategorizeRow } from '../src/server/labs/assetDescriptor/categorize';
import { embedDescriptorRows } from '../src/server/labs/assetDescriptor/embedding';

const PAGE = 200;

async function main() {
  const all = process.argv.includes('--all');
  const counts = new Map<string, number>();
  let done = 0;
  let lastId = '';
  for (;;) {
    const rows = await prisma.$queryRaw<CategorizeRow[]>`
      SELECT id, kind, retrieval_text, descriptor FROM asset_descriptors
      WHERE status = 'done' AND kind <> 'music' AND id > ${lastId} AND (${all} OR categories = '{}')
      ORDER BY id LIMIT ${PAGE}`;
    if (rows.length === 0) break;
    const cats = await classifyRows(rows);
    for (const [id, c] of cats) {
      await saveCategories(id, c);
      c.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
    }
    // Re-read so the embedded text includes the new categories.
    const fresh = await prisma.$queryRaw<CategorizeRow[]>`
      SELECT id, kind, retrieval_text, descriptor FROM asset_descriptors WHERE id = ANY(${rows.map((r) => r.id)}::text[])`;
    await embedDescriptorRows(fresh);
    done += rows.length;
    lastId = rows[rows.length - 1]!.id;
    console.log(`categorized + re-embedded ${done}`);
  }
  console.log('Per category:', Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])));
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
