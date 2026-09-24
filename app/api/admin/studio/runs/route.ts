/**
 * GET  /api/admin/studio/runs        — list all runs (newest first, limit 50)
 * POST /api/admin/studio/runs        — create a new run for a given URL
 */
import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';

export const maxDuration = 30;

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
  return json(runs);
});

// POST — create a new run
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { sourceUrl?: string; workspaceId?: string };
  if (!body.sourceUrl) {
    return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
  }

  // Normalise URL
  const raw = body.sourceUrl.trim();
  const sourceUrl = raw.startsWith('http') ? raw : `https://${raw}`;

  // Create brand profile (version 1)
  const profile = await prisma.studioBrandProfile.create({
    data: {
      sourceUrl,
      workspaceId: body.workspaceId ?? null,
      data: {},
      crawl: {},
    },
  });

  // Create run linked to profile
  const run = await prisma.studioRun.create({
    data: {
      brandProfileId: profile.id,
      workspaceId: body.workspaceId ?? null,
      extractStatus: 'pending',
    },
  });

  return json({ runId: run.id, profileId: profile.id });
});
