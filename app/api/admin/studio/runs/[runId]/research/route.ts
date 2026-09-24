/**
 * GET  /api/admin/studio/runs/[runId]/research   — list research items for this run
 * POST /api/admin/studio/runs/[runId]/research   — trigger research job
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../src/lib/db';
import { runResearch } from '../../../../../../../src/server/studio/researcher';

export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string }> };

// GET — list research items
export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const items = await prisma.studioResearchItem.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  });
  return json(items);
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
  const profileData = run.brandProfile.data as { market?: { keywords?: { value?: string[] } } };
  const profileKeywords = profileData.market?.keywords?.value ?? [];
  const keywords = body.keywords ?? profileKeywords;

  await prisma.studioRun.update({
    where: { id: runId },
    data: { researchStatus: 'running', researchError: null },
  });

  waitUntil(
    (async () => {
      const startedAt = Date.now();
      const profileData2 = run.brandProfile.data as { classification?: { vertical?: { value?: string } } };
      const vertical = profileData2.classification?.vertical?.value ?? 'generic';
      try {
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

  return json({ ok: true, runId });
});
