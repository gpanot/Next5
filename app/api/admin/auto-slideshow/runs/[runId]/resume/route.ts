/**
 * POST /api/admin/auto-slideshow/runs/[runId]/resume — { fromStep? (1-6, default: the failed step) }
 * Re-runs a finished or failed run from a step; earlier checkpoints are reused.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../src/lib/db';
import { runAutoPipeline } from '../../../../../../../src/server/autoSlideshow/pipeline';
import { AUTO_STEPS, isTerminalAutoStatus, type AutoRunStatus, type AutoStep } from '../../../../../../../src/types/admin/autoSlideshow';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string }> };

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { fromStep?: unknown };
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { status: true, failedStep: true } });
  if (!run) return json({ error: 'Run not found' }, { status: 404 });
  if (!isTerminalAutoStatus(run.status as AutoRunStatus)) return json({ error: 'Run is still going' }, { status: 409 });
  const fromStep = (AUTO_STEPS as readonly unknown[]).includes(body.fromStep) ? (body.fromStep as AutoStep) : ((run.failedStep ?? 1) as AutoStep);
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { status: `STEP_${fromStep}_RUNNING`, error: null, failedStep: null, finishedAt: null } });
  waitUntil(runAutoPipeline(runId, fromStep));
  return json({ ok: true, fromStep }, { status: 202 });
});
