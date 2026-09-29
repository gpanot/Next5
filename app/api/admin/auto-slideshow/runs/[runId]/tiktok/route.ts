/**
 * GET /api/admin/auto-slideshow/runs/[runId]/tiktok?workspaceId= — live creator info of a TikTok account (shown before
 * posting): the given workspace's, else the run's.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../src/lib/db';
import { creatorInfoFor } from '../../../../../../../src/server/autoSlideshow/posting';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const picked = new URL(req.url).searchParams.get('workspaceId');
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true } });
  const workspaceId = picked || run?.workspaceId;
  if (!workspaceId) return json({ error: 'Pick a workspace first' }, { status: 409 });
  return json({ creator: await creatorInfoFor(workspaceId) });
});
