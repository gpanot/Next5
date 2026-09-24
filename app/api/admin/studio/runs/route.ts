/**
 * GET    /api/admin/studio/runs        — list all runs (newest first, limit 50)
 * POST   /api/admin/studio/runs        — create a new run from a URL and auto-queue extraction
 * DELETE /api/admin/studio/runs?runId= — delete a run and all its candidates/research items
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute } from '../../../../../src/server/admin/route';
import { studioJson } from '../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../src/lib/db';
import { extractProfile } from '../../../../../src/server/studio/profileExtractor';

// Auto-extraction runs inside waitUntil — allow up to 120s
export const maxDuration = 120;

// GET — list runs
export const GET = adminRoute(async (_req: NextRequest) => {
  const runs = await prisma.studioRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      brandProfile: { select: { sourceUrl: true, version: true } },
      _count: { select: { candidates: true } },
    },
  });
  return studioJson(runs);
});

// POST — create a new run and auto-trigger extraction
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { sourceUrl?: string; workspaceId?: string };
  if (!body.sourceUrl) {
    return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
  }

  // Normalise URL
  const raw = body.sourceUrl.trim();
  const sourceUrl = raw.startsWith('http') ? raw : `https://${raw}`;

  // Create brand profile (version 1, empty data)
  const profile = await prisma.studioBrandProfile.create({
    data: {
      sourceUrl,
      workspaceId: body.workspaceId ?? null,
      data: {},
      crawl: {},
    },
  });

  // Create run with extractStatus = 'running' (extraction starts immediately below)
  const run = await prisma.studioRun.create({
    data: {
      brandProfileId: profile.id,
      workspaceId: body.workspaceId ?? null,
      extractStatus: 'running',
    },
  });

  // Auto-trigger extraction via waitUntil so the Lambda stays alive
  waitUntil(
    (async () => {
      const startedAt = Date.now();
      try {
        const result = await extractProfile({ sourceUrl });

        // Insert a new profile version with the extracted data
        const newProfile = await prisma.studioBrandProfile.create({
          data: {
            sourceUrl,
            workspaceId: body.workspaceId ?? null,
            version: 2,
            data: result.data as object,
            crawl: result.telemetry as object,
          },
        });

        await prisma.studioRun.update({
          where: { id: run.id },
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
          where: { id: run.id },
          data: {
            extractStatus: 'failed',
            extractError: msg,
            extractDurationMs: Date.now() - startedAt,
          },
        });
      }
    })(),
  );

  return studioJson({ runId: run.id, profileId: profile.id });
});

// DELETE — remove a run (cascades to candidates, research items via DB FK)
export const DELETE = adminRoute(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');
  if (!runId) return NextResponse.json({ error: 'runId is required' }, { status: 400 });

  const run = await prisma.studioRun.findUnique({ where: { id: runId } });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await prisma.studioRun.delete({ where: { id: runId } });
  return studioJson({ ok: true, runId });
});
