/**
 * Seeds the `prompts` table with all 25 prompts (5 studios × 5 scenes).
 * Safe to run multiple times — uses upsert.
 *
 * Run with:
 *   DATABASE_URL=... npx tsx scripts/seed-prompts.ts
 *
 * Or set DATABASE_URL in .env.local and run:
 *   npx tsx -r dotenv/config scripts/seed-prompts.ts dotenv_config_path=.env.local
 */

import { PrismaClient } from '@prisma/client';
import { STUDIO_PROMPTS } from '../src/data/prompts';

const prisma = new PrismaClient();

async function main() {
  const rows: { routeId: string; sceneIndex: number; prompt: string; isActive: boolean }[] = [];

  for (const [routeId, prompts] of Object.entries(STUDIO_PROMPTS)) {
    (prompts as readonly string[]).forEach((prompt, sceneIndex) => {
      rows.push({ routeId, sceneIndex, prompt, isActive: true });
    });
  }

  console.log(`\nSeeding ${rows.length} prompts…\n`);

  for (const row of rows) {
    await prisma.prompt.upsert({
      where: { routeId_sceneIndex: { routeId: row.routeId, sceneIndex: row.sceneIndex } },
      update: { prompt: row.prompt, isActive: row.isActive },
      create: row,
    });
  }

  console.log(`✅ Done — ${rows.length} prompts seeded (upserted).\n`);
  console.log('Routes seeded:');
  for (const routeId of Object.keys(STUDIO_PROMPTS)) {
    console.log(
      `  ${routeId} (${(STUDIO_PROMPTS as Record<string, readonly string[]>)[routeId].length} scenes)`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
