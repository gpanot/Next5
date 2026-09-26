/**
 * Upserts only the Shop scenes (set templates). Idempotent. Lighter than db:seed:business,
 * which also uploads every Studio model image.
 * Usage: npx tsx -r dotenv/config scripts/seed-shop-scenes.ts dotenv_config_path=.env.local
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { SHOP_TEMPLATES } from '../src/content/business/catalog/templates';

const prisma = new PrismaClient();

const main = async (): Promise<void> => {
  const host = (process.env.DATABASE_URL ?? '').replace(/^[^@]*@/, '').split('/')[0];
  console.log(`[seed-shop-scenes] target: ${host || '(DATABASE_URL not set)'}`);
  for (const t of SHOP_TEMPLATES) {
    const data = {
      product: t.product, name: t.name, description: t.description, coverImage: t.coverImage,
      sortOrder: t.sortOrder, config: t.config as unknown as Prisma.InputJsonValue, isActive: true,
    };
    await prisma.setTemplate.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
  }
  console.log(`[seed-shop-scenes] upserted ${SHOP_TEMPLATES.length} scenes`);
};

main()
  .catch((err: unknown) => {
    console.error('[seed-shop-scenes] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
