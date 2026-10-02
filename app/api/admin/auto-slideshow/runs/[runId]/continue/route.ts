/**
 * POST /api/admin/auto-slideshow/runs/[runId]/continue
 * Internal: the pipeline calls this after step 4 so photos and render get their own function time budget, and again
 * when step 5 ran out of its time budget with photos left.
 * Accepts only a run already marked STEP_5_RUNNING by that hand-off.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../src/lib/db';
import { runAutoPipeline } from '../../../../../../../src/server/autoSlideshow/pipeline';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string }> };

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { status: true } });
  if (!run) return json({ error: 'Run not found' }, { status: 404 });
  if (run.status !== 'STEP_5_RUNNING') return json({ error: `Run is ${run.status}, not waiting for step 5` }, { status: 409 });
  waitUntil(runAutoPipeline(runId, 5, 0, true));
  return json({ ok: true }, { status: 202 });
});
