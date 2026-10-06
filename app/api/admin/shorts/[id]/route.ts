/**
 * GET  /api/admin/shorts/[id] — one short with every step's output, prompts, photos, clips, costs and timings
 * POST /api/admin/shorts/[id] — { fromStep } → run the pipeline again from that step (a failed short: its failed step)
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';
import { runShortPipeline } from '../../../../../src/server/shorts/pipeline';
import { getShortDetail } from '../../../../../src/server/shorts/store';
import type { ShortStep } from '../../../../../src/types/admin/shorts';

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const short = await getShortDetail(id);
  return short ? json({ short }) : json({ error: 'Short not found' }, { status: 404 });
});

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { fromStep?: unknown };
  const short = await prisma.shortReel.findUnique({ where: { id }, select: { status: true, failedStep: true } });
  if (!short) return json({ error: 'Short not found' }, { status: 404 });
  if (short.status.endsWith('_RUNNING')) return json({ error: 'This short is still running' }, { status: 409 });
  const fromStep = (typeof body.fromStep === 'number' ? body.fromStep : short.failedStep ?? 1) as ShortStep;
  if (![1, 2, 3, 4, 5].includes(fromStep)) return json({ error: 'fromStep must be 1 to 5' }, { status: 400 });
  await prisma.shortReel.update({ where: { id }, data: { status: `STEP_${fromStep}_RUNNING`, error: null, failedStep: null, finishedAt: null } });
  waitUntil(runShortPipeline(id, fromStep));
  return json({ ok: true }, { status: 202 });
});
