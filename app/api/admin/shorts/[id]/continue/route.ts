/**
 * POST /api/admin/shorts/[id]/continue
 * Internal: the pipeline calls this so photos, video clips and the render each get their own function time budget.
 * Accepts only a short already marked STEP_3/4/5_RUNNING by that hand-off.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../src/lib/db';
import { runShortPipeline } from '../../../../../../src/server/shorts/pipeline';

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const short = await prisma.shortReel.findUnique({ where: { id }, select: { status: true } });
  if (!short) return json({ error: 'Short not found' }, { status: 404 });
  const step = ({ STEP_3_RUNNING: 3, STEP_4_RUNNING: 4, STEP_5_RUNNING: 5 } as const)[short.status as 'STEP_3_RUNNING'] ?? null;
  if (!step) return json({ error: `Short is ${short.status}, not waiting for clips or render` }, { status: 409 });
  waitUntil(runShortPipeline(id, step, true));
  return json({ ok: true }, { status: 202 });
});
