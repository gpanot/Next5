/**
 * GET  /api/admin/studio/runs/[runId]/generate   — list candidates for this run
 * POST /api/admin/studio/runs/[runId]/generate   — trigger generation job
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../../../src/lib/db';
import { getPresignedUrl } from '../../../../../../../src/lib/r2';
import { runGeneration } from '../../../../../../../src/server/studio/generator';

export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string }> };

// GET — list candidates with render status
export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const candidates = await prisma.studioCandidate.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch blitz project render status for accepted candidates (no Prisma relation — manual join)
  const blitzIds = candidates.map((c) => c.blitzProjectId).filter(Boolean) as string[];
  const blitzMap = new Map<string, { renderStatus: string; renderedVideoKey: string | null }>();
  if (blitzIds.length > 0) {
    const projects = await prisma.blitzProject.findMany({
      where: { id: { in: blitzIds } },
      select: { id: true, renderStatus: true, renderedVideoKey: true },
    });
    for (const p of projects) blitzMap.set(p.id, p);
  }

  // Attach presigned video URLs for completed renders
  const withUrls = await Promise.all(
    candidates.map(async (c) => {
      const bp = c.blitzProjectId ? blitzMap.get(c.blitzProjectId) : null;
      const videoKey = bp?.renderedVideoKey ?? null;
      const videoUrl = videoKey ? await getPresignedUrl(videoKey, 3600) : null;
      return { ...c, renderStatus: bp?.renderStatus ?? null, videoUrl };
    }),
  );

  return studioJson(withUrls);
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
