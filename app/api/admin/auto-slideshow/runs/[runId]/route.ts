/**
 * GET    /api/admin/auto-slideshow/runs/[runId] — full run: checkpoints, costs, slideshows (poll while running)
 * DELETE /api/admin/auto-slideshow/runs/[runId] — delete a run and its slideshows
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../src/lib/db';
import { getRunDto } from '../../../../../../src/server/autoSlideshow/store';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const run = await getRunDto(runId);
  return run ? json({ run }) : json({ error: 'Run not found' }, { status: 404 });
});

export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  await prisma.autoSlideshowRun.delete({ where: { id: runId } });
  return json({ ok: true });
});
