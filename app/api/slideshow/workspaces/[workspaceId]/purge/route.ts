/**
 * POST   /api/slideshow/workspaces/[workspaceId]/purge — "Delete forever": purge a deleted workspace in 2 minutes
 * DELETE /api/slideshow/workspaces/[workspaceId]/purge — undo that within the 2 minutes
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { cancelWorkspacePurge, scheduleWorkspacePurge } from '../../../../../../src/server/autoSlideshow/workspaceTrash';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const POST = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  return NextResponse.json({ purgeAt: await scheduleWorkspacePurge(requireUser(access).userId, workspaceId) });
});

export const DELETE = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  await cancelWorkspacePurge(requireUser(access).userId, workspaceId);
  return NextResponse.json({ ok: true });
});
