/**
 * Re-tags library videos (BlitzAsset type=BACKGROUND, video files) from their descriptor:
 * topic, setting, subject, activity, emotion and shot tags, then the industry labels.
 *
 *   npx tsx --env-file=.env.local scripts/retag-videos.ts            # all described videos
 *   npx tsx --env-file=.env.local scripts/retag-videos.ts --missing  # only videos still on old tags
 *   npx tsx --env-file=.env.local scripts/retag-videos.ts --dry-run  # print first batch, write nothing
 *
 * Cost: ~15 gpt-4o-mini calls for 565 videos.
 */
import { prisma } from '../src/lib/db';
import type { CategorizeRow } from '../src/server/labs/assetDescriptor/categorize';
import { hasCurrentTags, saveTags, tagRows } from '../src/server/labs/assetDescriptor/tags';

const PAGE = 200;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const missingOnly = process.argv.includes('--missing');
  const counts = new Map<string, number>();
  let done = 0;
  let lastId = '';
  for (;;) {
    const page = await prisma.$queryRaw<(CategorizeRow & { tags: string[] })[]>`
      SELECT d.id, d.kind, d.retrieval_text, d.descriptor, a.tags FROM asset_descriptors d
      JOIN blitz_assets a ON a.id = d.blitz_asset_id
      WHERE d.status = 'done' AND a.type = 'BACKGROUND' AND a.r2_key !~* '\\.(jpe?g|png|webp|gif|avif)$'
        AND d.id > ${lastId}
      ORDER BY d.id LIMIT ${PAGE}`;
    if (page.length === 0) break;
    lastId = page[page.length - 1]!.id;
    const rows = missingOnly ? page.filter((r) => !hasCurrentTags(r.tags)) : page;
    if (rows.length === 0) continue;
    const tags = await tagRows(dryRun ? rows.slice(0, 10) : rows);
    if (dryRun) {
      tags.forEach((t, id) => console.log(id, t.join(' | ')));
      return;
    }
    for (const [id, t] of tags) {
      await saveTags(id, t);
      t.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
    }
    done += rows.length;
    console.log(`tagged ${tags.size}/${rows.length} (total seen ${done})`);
  }
  console.log('Per tag:', Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])));
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
