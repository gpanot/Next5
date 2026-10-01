/** POST /api/slideshow/workspaces/[workspaceId]/restore — bring back a workspace deleted in the last 30 days */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { restoreSlideshowWorkspace } from '../../../../../../src/server/autoSlideshow/workspaceTrash';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const POST = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  await restoreSlideshowWorkspace(requireUser(access).userId, workspaceId);
  return NextResponse.json({ ok: true });
});
