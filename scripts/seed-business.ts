/**
 * Seeds business reference data: set templates and themes. Idempotent (upserts).
 * Usage: npm run db:seed:business   (uses DATABASE_URL — point it at the right database!)
 * Studio models are seeded in P8 once their images exist.
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { ALL_TEMPLATES } from '../src/content/business/catalog/templates';
import { THEMES } from '../src/content/business/catalog/themes';

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

const main = async (): Promise<void> => {
  const host = (process.env.DATABASE_URL ?? '').replace(/^[^@]*@/, '').split('/')[0];
  console.log(`[seed-business] target: ${host || '(DATABASE_URL not set)'}`);
  const templates = await seedTemplates();
  const themes = await seedThemes();
  console.log(`[seed-business] upserted ${templates} templates, ${themes} themes`);
};

main()
  .catch((err: unknown) => {
    console.error('[seed-business] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
