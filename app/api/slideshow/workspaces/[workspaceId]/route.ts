/**
 * GET    /api/slideshow/workspaces/[workspaceId] — what deleting it touches: { slideshows, scheduledPosts }
 * DELETE /api/slideshow/workspaces/[workspaceId] — move it to the trash (restorable for 30 days) and cancel its scheduled posts
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { deleteSlideshowWorkspace, getWorkspaceDeleteImpact } from '../../../../../src/server/autoSlideshow/workspaceTrash';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  return NextResponse.json(await getWorkspaceDeleteImpact(requireUser(access).userId, workspaceId));
});

export const DELETE = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  await deleteSlideshowWorkspace(requireUser(access).userId, workspaceId);
  return NextResponse.json({ ok: true });
});
