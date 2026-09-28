/**
 * POST /api/admin/meta-ads/runs/[runId]/resume — { fromStep: 1-6 }
 * Re-runs the pipeline from one step, reusing the saved checkpoints of the steps before it.
 * Step 5 redesigns only the ads that are not ready; step 6 re-composites every ad on its saved image.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../src/lib/db';
import { runPipeline } from '../../../../../../../src/server/metaAds/pipeline';
import { isTerminalStatus, type MetaAdRunStatus, type PipelineStep } from '../../../../../../../src/types/admin/metaAds';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string }> };

const isStep = (value: unknown): value is PipelineStep => value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { fromStep?: unknown };
  if (!isStep(body.fromStep)) return json({ error: 'fromStep must be 1-6' }, { status: 400 });
  const run = await prisma.metaAdRun.findUnique({ where: { id: runId }, select: { status: true } });
  if (!run) return json({ error: 'Run not found' }, { status: 404 });
  if (!isTerminalStatus(run.status as MetaAdRunStatus)) return json({ error: 'Run is still going' }, { status: 409 });
  await prisma.metaAdRun.update({ where: { id: runId }, data: { status: `STEP_${body.fromStep}_RUNNING`, finishedAt: null, startedAt: new Date() } });
  waitUntil(runPipeline(runId, body.fromStep));
  return json({ ok: true });
});
