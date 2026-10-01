/**
 * GET /api/admin/auto-slideshow/runs/[runId]/tiktok?workspaceId= — live creator info of a TikTok account (shown before
 * posting): the given workspace's, else the run's.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { prisma } from '../../../../../../../src/lib/db';
import { creatorInfoFor } from '../../../../../../../src/server/autoSlideshow/posting';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  const runWorkspace = await assertRunAccess(access, runId);
  const picked = access.admin ? new URL(req.url).searchParams.get('workspaceId') : runWorkspace;
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true } });
  const workspaceId = picked || run?.workspaceId;
  if (!workspaceId) return json({ error: 'Pick a workspace first' }, { status: 409 });
  return json({ creator: await creatorInfoFor(workspaceId) });
});
