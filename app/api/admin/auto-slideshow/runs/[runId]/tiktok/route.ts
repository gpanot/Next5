/** GET /api/admin/auto-slideshow/runs/[runId]/tiktok — live creator info of the run's TikTok account (shown before posting) */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../src/lib/db';
import { creatorInfoFor } from '../../../../../../../src/server/autoSlideshow/posting';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true } });
  if (!run?.workspaceId) return json({ error: 'Pick a workspace first' }, { status: 409 });
  return json({ creator: await creatorInfoFor(run.workspaceId) });
});
