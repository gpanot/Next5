/**
 * Backfill pgvector embeddings for described assets (slideshow engine semantic search).
 *
 *   npx tsx --env-file=.env.local scripts/embed-asset-descriptors.ts          # only missing
 *   npx tsx --env-file=.env.local scripts/embed-asset-descriptors.ts --all    # re-embed everything
 *
 * Needs migration 20261014100000_asset_descriptor_embeddings.sql. Cost: ~1,800 assets ≈ $0.01.
 */
import { prisma } from '../src/lib/db';
import { embedDescriptorRows, embeddingColumnReady } from '../src/server/labs/assetDescriptor/embedding';

const BATCH = 100;

async function main() {
  if (!(await embeddingColumnReady())) {
    console.error('asset_descriptors.embedding is missing — run `npm run db:migrate` first.');
    process.exit(1);
  }
  const all = process.argv.includes('--all');
  let done = 0;
  let lastId = '';
  for (;;) {
    const rows = await prisma.$queryRaw<Array<{ id: string; kind: string; retrieval_text: string | null; descriptor: unknown }>>`
      SELECT id, kind, retrieval_text, descriptor FROM asset_descriptors
      WHERE status = 'done' AND id > ${lastId} AND (${all} OR embedding IS NULL)
      ORDER BY id LIMIT ${BATCH}`;
    if (rows.length === 0) break;
    const written = await embedDescriptorRows(rows);
    if (written === 0) throw new Error('Embedding batch failed — see the error above.');
    done += written;
    lastId = rows[rows.length - 1]!.id;
    console.log(`embedded ${done}`);
  }
  console.log(`Done: ${done} descriptors embedded.`);
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
