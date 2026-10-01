/**
 * POST /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/post — the editor's "Post now":
 * { workspaceId (admin), platforms, tiktok?: { privacyLevel, allowComments, brandOrganic, brandContent, consent } }
 * → approve and send now on each platform. Returns the slideshow's posts.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../../src/server/autoSlideshow/route';
import { parsePlatforms } from '../../../../../../../../../src/server/autoSlideshow/parsePosting';
import { postSlideshowNow } from '../../../../../../../../../src/server/autoSlideshow/posting';
import { HttpError } from '../../../../../../../../../src/server/http';

export const maxDuration = 60;

type Ctx = { params: Promise<{ runId: string; slideshowId: string }> };

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  const runWorkspace = await assertRunAccess(access, runId);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // A user's run always posts with its own workspace's accounts.
  const workspaceId = access.admin ? b.workspaceId : runWorkspace;
  if (typeof workspaceId !== 'string' || !workspaceId) throw new HttpError(400, 'no_workspace', 'Pick the account to post with.');
  const posts = await postSlideshowNow(runId, slideshowId, { workspaceId, ...parsePlatforms(b) });
  return json({ posts });
});
