/**
 * GET  /api/admin/studio/runs/[runId]/profile   — return current run + profile data
 * POST /api/admin/studio/runs/[runId]/profile   — trigger (or re-trigger) extract job
 * PATCH /api/admin/studio/runs/[runId]/profile  — save manual edits to profile fields
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../../../src/lib/db';
import { extractProfile } from '../../../../../../../src/server/studio/profileExtractor';
import { isManualSource } from '../../../../../../../src/lib/manualProfile';

export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string }> };

// GET — return current run + profile data
export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const run = await prisma.studioRun.findUnique({
    where: { id: runId },
    include: { brandProfile: true },
  });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return studioJson(run);
});

// POST — trigger profile extraction
export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;

  const run = await prisma.studioRun.findUnique({
    where: { id: runId },
    include: { brandProfile: true },
  });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Hand-typed profiles ("B2B No Website") have no URL to crawl.
  if (isManualSource(run.brandProfile.sourceUrl)) {
    return NextResponse.json({ error: 'This profile was typed by hand. Edit it in Blitz Slideshow → B2B No Website.' }, { status: 409 });
  }

  // Guard: only allow re-trigger if not currently running
  if (run.extractStatus === 'running') {
    return NextResponse.json({ error: 'extraction already running' }, { status: 409 });
  }

  // Set status to running immediately so the UI updates
  await prisma.studioRun.update({
    where: { id: runId },
    data: { extractStatus: 'running', extractError: null },
  });

  // Fire extraction in the background — Lambda stays alive via waitUntil
  waitUntil(
    (async () => {
      const startedAt = Date.now();
      try {
        const result = await extractProfile({ sourceUrl: run.brandProfile.sourceUrl });

        // Insert new profile version
        const nextVersion = run.brandProfile.version + 1;
        const newProfile = await prisma.studioBrandProfile.create({
          data: {
            sourceUrl: run.brandProfile.sourceUrl,
            workspaceId: run.workspaceId,
            version: nextVersion,
            data: result.data as object,
            crawl: result.telemetry as object,
          },
        });

        await prisma.studioRun.update({
          where: { id: runId },
          data: {
            brandProfileId: newProfile.id,
            extractStatus: 'done',
            extractError: null,
            extractDurationMs: Date.now() - startedAt,
            extractCostUsdMicros: BigInt(result.telemetry.totalCostUsdMicros),
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.studioRun.update({
          where: { id: runId },
          data: {
            extractStatus: 'failed',
            extractError: msg,
            extractDurationMs: Date.now() - startedAt,
          },
        });
      }
    })(),
  );

  return studioJson({ ok: true, runId });
});

// PATCH — save manual field edits to the current profile
export const PATCH = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const body = (await req.json()) as { data?: Record<string, unknown> };

  const run = await prisma.studioRun.findUnique({
    where: { id: runId },
    include: { brandProfile: true },
  });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!body.data) return NextResponse.json({ error: 'data is required' }, { status: 400 });

  // Merge patch: create new version with merged data (preserves field envelopes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged = { ...(run.brandProfile.data as any), ...body.data } as Record<string, unknown>;
  const nextVersion = run.brandProfile.version + 1;
  const newProfile = await prisma.studioBrandProfile.create({
    data: {
      sourceUrl: run.brandProfile.sourceUrl,
      workspaceId: run.workspaceId,
      version: nextVersion,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: merged as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      crawl: run.brandProfile.crawl as any,
    },
  });

  await prisma.studioRun.update({
    where: { id: runId },
    data: { brandProfileId: newProfile.id },
  });

  return studioJson({ ok: true, profileId: newProfile.id, version: nextVersion });
});
