/**
 * GET /api/admin/studio/runs/[runId]/summary
 *
 * Returns a run summary with:
 * - Per-stage timing and cost
 * - Candidate counts (total / accepted / rejected / pending)
 * - Research item counts
 * - Success metric targets vs actuals
 *
 * This is the "run report card" used to evaluate pipeline quality over time.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../src/lib/db';

export const maxDuration = 30;

type Ctx = { params: Promise<{ runId: string }> };

// Target metrics from the plan
const TARGETS = {
  extractDurationMs: 40_000,    // < 40s
  researchDurationMs: 60_000,   // < 60s
  generateDurationMs: 90_000,   // < 90s
  totalCostUsdMicros: 50_000,   // < $0.05 total
  acceptanceRate: 0.5,          // ≥ 50% candidates accepted
  candidatesWithHook: 0.8,      // ≥ 80% candidates have a hook (from research)
};

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;

  const run = await prisma.studioRun.findUnique({
    where: { id: runId },
    include: { brandProfile: true },
  });
  if (!run) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const [candidateCounts, researchCount] = await Promise.all([
    prisma.studioCandidate.groupBy({
      by: ['status'],
      where: { runId },
      _count: { id: true },
    }),
    prisma.studioResearchItem.count({ where: { runId } }),
  ]);

  const countByStatus = Object.fromEntries(
    candidateCounts.map((g) => [g.status, g._count.id]),
  );
  const total = Object.values(countByStatus).reduce((s, n) => s + n, 0);
  const accepted = countByStatus['accepted'] ?? 0;
  const rejected = countByStatus['rejected'] ?? 0;
  const pending = countByStatus['pending'] ?? 0;

  const totalCostMicros =
    Number(run.extractCostUsdMicros ?? 0) + Number(run.researchCostUsdMicros ?? 0);

  const acceptanceRate = total > 0 ? accepted / total : 0;

  const metrics = {
    extract: {
      durationMs: run.extractDurationMs,
      costUsdMicros: run.extractCostUsdMicros?.toString() ?? null,
      targetMs: TARGETS.extractDurationMs,
      onTarget: run.extractDurationMs != null && run.extractDurationMs < TARGETS.extractDurationMs,
    },
    research: {
      durationMs: run.researchDurationMs,
      costUsdMicros: run.researchCostUsdMicros?.toString() ?? null,
      targetMs: TARGETS.researchDurationMs,
      onTarget: run.researchDurationMs != null && run.researchDurationMs < TARGETS.researchDurationMs,
    },
    generate: {
      durationMs: run.generateDurationMs,
      targetMs: TARGETS.generateDurationMs,
      onTarget: run.generateDurationMs != null && run.generateDurationMs < TARGETS.generateDurationMs,
    },
    totalCost: {
      usdMicros: totalCostMicros,
      targetUsdMicros: TARGETS.totalCostUsdMicros,
      onTarget: totalCostMicros < TARGETS.totalCostUsdMicros,
    },
  };

  const quality = {
    researchItems: researchCount,
    candidatesTotal: total,
    candidatesAccepted: accepted,
    candidatesRejected: rejected,
    candidatesPending: pending,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    acceptanceRateTarget: TARGETS.acceptanceRate,
    acceptanceOnTarget: acceptanceRate >= TARGETS.acceptanceRate,
  };

  const overallPass =
    (metrics.extract.onTarget ?? true) &&
    (metrics.research.onTarget ?? true) &&
    (metrics.generate.onTarget ?? true) &&
    metrics.totalCost.onTarget &&
    quality.acceptanceOnTarget;

  return json({
    runId,
    sourceUrl: run.brandProfile.sourceUrl,
    profileVersion: run.brandProfile.version,
    step: run.step,
    createdAt: run.createdAt,
    metrics,
    quality,
    overallPass,
  });
});
