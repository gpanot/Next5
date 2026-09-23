/**
 * Phase 0B seed — the Phase 0A starter library.
 *
 * Usage:
 *   npm run db:seed:templates                      # uses .env.local
 *   DATABASE_URL=… tsx scripts/seed-content-templates.ts
 *
 * Idempotent: re-running leaves one row per template and never touches workspace overrides.
 * Source data: scripts/data/content-templates/*.json
 */
import { PrismaClient } from '@prisma/client';
import { seedContentTemplates } from '../src/server/templates/seed';

const prisma = new PrismaClient();

async function main() {
  const { pillars, templates } = await seedContentTemplates(prisma);
  console.log(`[seed-content-templates] ${pillars} pillars, ${templates} templates`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
