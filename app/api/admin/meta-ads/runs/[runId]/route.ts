/**
 * GET    /api/admin/meta-ads/runs/[runId] — full run: step checkpoints + ads (poll while running)
 * DELETE /api/admin/meta-ads/runs/[runId] — delete a run and its ads
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../src/lib/db';
import { getRunDto } from '../../../../../../src/server/metaAds/store';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const run = await getRunDto(runId);
  return run ? json({ run }) : json({ error: 'Run not found' }, { status: 404 });
});

export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  await prisma.metaAdRun.delete({ where: { id: runId } });
  return json({ ok: true });
});
