/**
 * Copies UGC Lab characters and videos from one database into another, so videos made while
 * testing can be watched on another deployment without generating them again.
 *
 * The video files themselves live in R2 and are not touched: both deployments must use the same
 * bucket (R2_BUCKET_NAME), otherwise the rows arrive but the players find nothing.
 *
 * Reads from DATABASE_URL, writes to UGC_SYNC_TARGET_URL. Prints the plan and changes nothing
 * unless --apply is passed. Rows already in the target are updated, never duplicated.
 *
 *   node --env-file=.env.local --import tsx scripts/ugc-sync.ts            # dry run
 *   UGC_SYNC_TARGET_URL=... node --env-file=.env.local --import tsx scripts/ugc-sync.ts --apply
 */

import { Prisma, PrismaClient, type UgcCharacter } from '@prisma/client';

const apply = process.argv.includes('--apply');

const client = (url: string) => new PrismaClient({ datasources: { db: { url } } });

const need = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
};

async function main() {
  const sourceUrl = need('DATABASE_URL');
  const targetUrl = need('UGC_SYNC_TARGET_URL');
  if (sourceUrl === targetUrl) {
    console.log('Source and target are the same database. Nothing to sync.');
    return;
  }

  const source = client(sourceUrl);
  const target = client(targetUrl);
  try {
    const characters = await source.ugcCharacter.findMany();
    const videos = await source.ugcVideo.findMany({ orderBy: { createdAt: 'asc' } });
    const before = { characters: await target.ugcCharacter.count(), videos: await target.ugcVideo.count() };
    console.log(`source: ${characters.length} characters, ${videos.length} videos`);
    console.log(`target: ${before.characters} characters, ${before.videos} videos`);

    if (!apply) {
      console.log('Dry run. Re-run with --apply to write.');
      return;
    }

    // Characters first: videos point at them. A null scene has to be written as Prisma's JSON null.
    for (const character of characters) {
      const data = { ...character, scene: character.scene ?? Prisma.DbNull } satisfies Omit<UgcCharacter, 'scene'> & {
        scene: Prisma.InputJsonValue | typeof Prisma.DbNull;
      };
      await target.ugcCharacter.upsert({ where: { id: character.id }, create: data, update: data });
    }
    for (const video of videos) {
      await target.ugcVideo.upsert({ where: { id: video.id }, create: video, update: video });
    }
    console.log(`done: ${await target.ugcCharacter.count()} characters, ${await target.ugcVideo.count()} videos in the target`);
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
