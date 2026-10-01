/**
 * POST /api/admin/auto-slideshow/runs/[runId]/resume — { fromStep? (1-6, default: the failed step) }
 * Re-runs a finished or failed run from a step; earlier checkpoints are reused.
 * A failed "Get more" (step 4 or later, with slideshows already made) resumes as "Get more": only the missing ones are
 * written, so the slideshows the run already has are kept.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { prisma } from '../../../../../../../src/lib/db';
import { runAutoPipeline } from '../../../../../../../src/server/autoSlideshow/pipeline';
import { AUTO_STEPS, isTerminalAutoStatus, type AutoRunStatus, type AutoStep } from '../../../../../../../src/types/admin/autoSlideshow';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string }> };

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as { fromStep?: unknown };
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { status: true, failedStep: true, count: true } });
  if (!run) return json({ error: 'Run not found' }, { status: 404 });
  if (!isTerminalAutoStatus(run.status as AutoRunStatus)) return json({ error: 'Run is still going' }, { status: 409 });
  const fromStep = (AUTO_STEPS as readonly unknown[]).includes(body.fromStep) ? (body.fromStep as AutoStep) : ((run.failedStep ?? 1) as AutoStep);
  const made = fromStep === 4 ? await prisma.autoSlideshow.count({ where: { runId } }) : 0;
  const append = made > 0 ? Math.max(0, run.count - made) : 0;
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { status: `STEP_${fromStep}_RUNNING`, error: null, failedStep: null, finishedAt: null, startedAt: new Date() } });
  waitUntil(runAutoPipeline(runId, fromStep, append));
  return json({ ok: true, fromStep }, { status: 202 });
});
