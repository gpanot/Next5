/**
 * GET  /api/admin/studio/runs/[runId]/generate   — list candidates for this run
 * POST /api/admin/studio/runs/[runId]/generate   — trigger generation job
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../../../src/lib/db';
import { runGeneration } from '../../../../../../../src/server/studio/generator';

export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string }> };

// GET — list candidates
export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const candidates = await prisma.studioCandidate.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  });
  return studioJson(candidates);
});

// POST — trigger generation
export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;

  const run = await prisma.studioRun.findUnique({
    where: { id: runId },
    include: { brandProfile: true },
  });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (run.generateStatus === 'running') {
    return NextResponse.json({ error: 'generation already running' }, { status: 409 });
  }
  if (run.researchStatus !== 'done') {
    return NextResponse.json({ error: 'research must complete before generation' }, { status: 422 });
  }

  await prisma.studioRun.update({
    where: { id: runId },
    data: { generateStatus: 'running', generateError: null },
  });

  waitUntil(
    (async () => {
      const startedAt = Date.now();
      try {
        // runGeneration stores candidates internally and returns telemetry
        const result = await runGeneration({
          runId,
          profileVersion: run.brandProfile.version,
        });

        await prisma.studioRun.update({
          where: { id: runId },
          data: {
            generateStatus: 'done',
            generateError: null,
            generateDurationMs: Date.now() - startedAt,
          },
        });

        console.log(`[studio/generate] run=${runId} candidates=${result.candidates} durationMs=${result.telemetry.totalDurationMs} costMicros=${result.telemetry.totalCostUsdMicros}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.studioRun.update({
          where: { id: runId },
          data: {
            generateStatus: 'failed',
            generateError: msg,
            generateDurationMs: Date.now() - startedAt,
          },
        });
      }
    })(),
  );

  return studioJson({ ok: true, runId });
});
