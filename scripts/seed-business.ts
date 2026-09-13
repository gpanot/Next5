/**
 * Seeds business reference data: set templates and themes. Idempotent (upserts).
 * Usage: npm run db:seed:business   (uses DATABASE_URL — point it at the right database!)
 * Studio models: images are uploaded to object storage (NEXT5_STORAGE decides local vs R2).
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { ALL_TEMPLATES } from '../src/content/business/catalog/templates';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { STUDIO_MODELS } from '../src/content/business/catalog/studioModels';
import { THEMES } from '../src/content/business/catalog/themes';
import { putObject } from '../src/server/storage/objectStore';
import { studioModelKey } from '../src/server/storage/keys';

const prisma = new PrismaClient();

const seedTemplates = async (): Promise<number> => {
  for (const t of ALL_TEMPLATES) {
    const data = {
      product: t.product,
      name: t.name,
      description: t.description,
      coverImage: t.coverImage,
      sortOrder: t.sortOrder,
      config: t.config as unknown as Prisma.InputJsonValue,
      isActive: true,
    };
    await prisma.setTemplate.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
  }
  return ALL_TEMPLATES.length;
};

const seedThemes = async (): Promise<number> => {
  for (const theme of THEMES) {
    const data = {
      title: theme.title,
      description: theme.description,
      coverImage: theme.coverImage,
      featuredMonth: theme.featuredMonth,
      sortOrder: theme.sortOrder,
      scenes: theme.scenes as unknown as Prisma.InputJsonValue,
      isActive: true,
    };
    await prisma.theme.upsert({ where: { id: theme.id }, update: data, create: { id: theme.id, ...data } });
  }
  return THEMES.length;
};

const seedStudioModels = async (): Promise<number> => {
  for (const model of STUDIO_MODELS) {
    for (const [kind, image] of [['face', model.faceImage], ['full', model.fullImage]] as const) {
      const key = studioModelKey(model.slug, kind);
      await putObject(key, await readFile(path.join(process.cwd(), 'public', image)));
      const dbKind = kind === 'face' ? 'face' : 'full_body';
      const existing = await prisma.identityReference.findFirst({ where: { isStudioModel: true, studioModelSlug: model.slug, kind: dbKind } });
      if (existing) await prisma.identityReference.update({ where: { id: existing.id }, data: { r2Key: key, deletedAt: null, wavespeedUrl: null } });
      else await prisma.identityReference.create({ data: { isStudioModel: true, studioModelSlug: model.slug, kind: dbKind, r2Key: key } });
    }
  }
  return STUDIO_MODELS.length;
};

const main = async (): Promise<void> => {
  const host = (process.env.DATABASE_URL ?? '').replace(/^[^@]*@/, '').split('/')[0];
  console.log(`[seed-business] target: ${host || '(DATABASE_URL not set)'}`);
  const templates = await seedTemplates();
  const themes = await seedThemes();
  const models = await seedStudioModels();
  console.log(`[seed-business] upserted ${templates} templates, ${themes} themes, ${models} studio models`);
};

main()
  .catch((err: unknown) => {
    console.error('[seed-business] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
