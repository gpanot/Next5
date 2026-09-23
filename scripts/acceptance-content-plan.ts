/**
 * Phase 0B acceptance run — 3 businesses × 3 goals, no human picking a template.
 *
 * Usage:
 *   DATABASE_URL=… tsx scripts/acceptance-content-plan.ts
 *
 * Creates three throwaway workspaces, proposes a week for each goal, prints the plans, then
 * deletes them. Read the output: a plan with a blank slot or a repeated idea is a failure even
 * when the script exits 0.
 */
import { PrismaClient } from '@prisma/client';
import { proposePlan } from '../src/server/automation/matching';
import { CAMPAIGN_GOALS } from '../src/config/contentTemplates';

const prisma = new PrismaClient();

const BUSINESSES = [
  { label: 'Mobile mechanic (B2C service)', audienceType: 'b2c' as const },
  { label: 'Steel plate distributor (B2B supplier)', audienceType: 'b2b' as const },
  { label: 'Listing agent (B2C, sells to both)', audienceType: 'both' as const },
];

const START = '2026-10-05';

async function main() {
  let failures = 0;

  for (const business of BUSINESSES) {
    const user = await prisma.user.create({
      data: { email: `acceptance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com` },
    });
    const ws = await prisma.workspace.create({
      data: { ownerUserId: user.id, product: 'brand', name: business.label, audienceType: business.audienceType },
    });

    for (const goal of CAMPAIGN_GOALS) {
      const plan = await proposePlan({
        workspaceId: ws.id,
        goal,
        channels: ['tiktok', 'instagram'],
        startDate: START,
      });

      console.log(`\n── ${business.label} · goal: ${goal} ${'─'.repeat(20)}`);
      for (const slot of plan) {
        const needs = slot.requiredUploads.map((a) => a.label).join(', ') || 'nothing to upload';
        console.log(
          `  ${slot.date}  ${slot.purpose.padEnd(11)} ${slot.templateName.padEnd(28)} v${slot.version}  ${slot.platforms.join('+').padEnd(18)} needs: ${needs}${slot.widened ? '  [widened]' : ''}`,
        );
      }

      const unique = new Set(plan.map((s) => s.templateId)).size;
      if (plan.length !== 7) {
        console.error(`  ✗ expected 7 slots, got ${plan.length}`);
        failures += 1;
      }
      if (unique !== plan.length) {
        console.error(`  ✗ ${plan.length - unique} repeated template(s) inside one week`);
        failures += 1;
      }
    }

    await prisma.workspace.delete({ where: { id: ws.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log(failures === 0 ? '\n✓ 9 plans, 7 slots each, no repeats' : `\n✗ ${failures} failure(s)`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
