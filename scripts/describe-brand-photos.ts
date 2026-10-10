/**
 * Re-describes Your Brand Content photos whose background description failed or never finished.
 *
 * Usage:
 *   npm run brand-photos:describe            # failed ones, and pending ones older than 10 minutes
 *   npm run brand-photos:describe -- --dry   # list them only
 *   npm run brand-photos:describe -- --all   # also done ones described by an older prompt (DESCRIBE_VERSION)
 *
 * One photo at a time (each call is ~3 s), so it never floods the model provider.
 */
import { prisma } from '../src/lib/db';
import { DESCRIBE_VERSION, describeBrandPhoto } from '../src/server/brandContent/describePhoto';
import { getObject } from '../src/server/storage/objectStore';

/** A pending photo younger than this may still be described by its upload's background work. */
const STUCK_MS = 10 * 60 * 1000;

async function main() {
  const dry = process.argv.includes('--dry');
  const all = process.argv.includes('--all');
  const found = await prisma.userUpload.findMany({
    where: {
      kind: 'photo',
      archivedAt: null,
      OR: [
        { describeStatus: 'failed' },
        { describeStatus: 'pending', createdAt: { lt: new Date(Date.now() - STUCK_MS) } },
        ...(all ? [{ describeStatus: 'done' }] : []),
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, r2Key: true, describeStatus: true, describeError: true, descriptor: true },
  });
  const versionOf = (d: unknown) => Number((d as { version?: unknown } | null)?.version ?? 1);
  const rows = found.filter((r) => r.describeStatus !== 'done' || versionOf(r.descriptor) < DESCRIBE_VERSION);
  console.log(`${rows.length} photo(s) to describe${dry ? ' (dry run)' : ''}`);
  let done = 0;
  for (const row of rows) {
    console.log(`- ${row.id} [${row.describeStatus}]${row.describeError ? ` ${row.describeError}` : ''}`);
    if (dry) continue;
    const jpeg = await getObject(row.r2Key);
    if (!jpeg) {
      await prisma.userUpload.update({ where: { id: row.id }, data: { describeStatus: 'failed', describeError: 'Photo file not found in storage' } });
      continue;
    }
    await describeBrandPhoto(row.id, jpeg);
    const after = await prisma.userUpload.findUnique({ where: { id: row.id }, select: { describeStatus: true } });
    if (after?.describeStatus === 'done') done++;
  }
  if (!dry) console.log(`Described ${done} of ${rows.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
