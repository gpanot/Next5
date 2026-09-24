/**
 * GET  /api/admin/studio/runs/[runId]/research   — list research items for this run
 * POST /api/admin/studio/runs/[runId]/research   — trigger research job
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../../../src/lib/db';
import { runResearch } from '../../../../../../../src/server/studio/researcher';
import { getVerticalPack } from '../../../../../../../src/server/studio/verticalPacks';

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
  const profileData = run.brandProfile.data as {
    market?: { keywords?: { value?: string[] } };
    classification?: { vertical?: { value?: string } };
  };
  const profileKeywords = profileData.market?.keywords?.value ?? [];
  const vertical = profileData.classification?.vertical?.value ?? 'generic';
  // Safety net: an empty keyword list (e.g. an older run predating a keyword-discovery
  // fix, or an extraction that produced nothing usable) must not run research with
  // zero keywords. Fall back to the curated per-vertical list rather than searching nothing.
  const keywords = body.keywords ?? (profileKeywords.length > 0 ? profileKeywords : getVerticalPack(vertical).researchKeywords.slice(0, 4));

  await prisma.studioRun.update({
    where: { id: runId },
    data: { researchStatus: 'running', researchError: null },
  });

  waitUntil(
    (async () => {
      const startedAt = Date.now();
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

  return studioJson({ ok: true, runId });
});
