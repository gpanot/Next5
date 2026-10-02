/**
 * POST /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/video — start (or reuse) the MP4 render
 * GET  /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/video?projectId=&downloadId= — poll it; downloadUrl once done
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../../src/server/autoSlideshow/route';
import { getSlideshowVideo, startSlideshowVideo } from '../../../../../../../../../src/server/autoSlideshow/video';

type Ctx = { params: Promise<{ runId: string; slideshowId: string }> };

export const POST = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  const workspaceId = await assertRunAccess(access, runId);
  return json({ video: await startSlideshowVideo(runId, slideshowId, { workspaceId, userId: access.admin ? null : access.userId }) });
});

export const GET = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  await assertRunAccess(access, runId);
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return json({ error: 'projectId is required' }, { status: 400 });
  return json({ video: await getSlideshowVideo(runId, slideshowId, projectId, req.nextUrl.searchParams.get('downloadId')) });
});
