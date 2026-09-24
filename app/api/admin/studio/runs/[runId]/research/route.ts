/**
 * GET    /api/admin/studio/runs/[runId]/research   — list research items for this run
 * POST   /api/admin/studio/runs/[runId]/research   — trigger research job
 * DELETE /api/admin/studio/runs/[runId]/research   — clear all research items and reset status
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../../../src/lib/db';
import { runResearch } from '../../../../../../../src/server/studio/researcher';
import { resolveResearchKeywords } from '../../../../../../../src/server/studio/researchKeywords';
import type { StudioProfileData } from '../../../../../../../src/server/studio/types';

export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string }> };

// GET — list research items
export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const items = await prisma.studioResearchItem.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  });
  return studioJson(items);
});

// POST — trigger research
export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;

  const run = await prisma.studioRun.findUnique({
    where: { id: runId },
    include: { brandProfile: true },
  });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (run.researchStatus === 'running') {
    return NextResponse.json({ error: 'research already running' }, { status: 409 });
  }
  if (run.extractStatus !== 'done') {
    return NextResponse.json({ error: 'profile extraction must complete before research' }, { status: 422 });
  }

  const body = (await req.json().catch(() => ({}))) as { keywords?: string[] };
  const profileData = run.brandProfile.data as StudioProfileData;
  const vertical = profileData.classification?.vertical?.value ?? 'generic';

  await prisma.studioRun.update({
    where: { id: runId },
    data: { researchStatus: 'running', researchError: null },
  });

  waitUntil(
    (async () => {
      const startedAt = Date.now();
      try {
        const keywords = body.keywords ?? (await resolveResearchKeywords(runId, run.brandProfile));
        const result = await runResearch({ runId, keywords, vertical });
        await prisma.studioRun.update({
          where: { id: runId },
          data: {
            researchStatus: 'done',
            researchError: null,
            researchDurationMs: Date.now() - startedAt,
            researchCostUsdMicros: BigInt(result.telemetry.totalCostUsdMicros),
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.studioRun.update({
          where: { id: runId },
          data: {
            researchStatus: 'failed',
            researchError: msg,
            researchDurationMs: Date.now() - startedAt,
          },
        });
      }
    })(),
  );

  return studioJson({ ok: true, runId });
});

// DELETE — clear all research items and reset status to 'idle'
export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;

  const run = await prisma.studioRun.findUnique({ where: { id: runId }, select: { id: true, researchStatus: true } });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (run.researchStatus === 'running') {
    return NextResponse.json({ error: 'cannot clear while research is running' }, { status: 409 });
  }

  await prisma.studioResearchItem.deleteMany({ where: { runId } });
  await prisma.studioRun.update({
    where: { id: runId },
    data: { researchStatus: 'idle', researchError: null, researchDurationMs: null, researchCostUsdMicros: null },
  });

  return studioJson({ ok: true, runId, deleted: true });
});
