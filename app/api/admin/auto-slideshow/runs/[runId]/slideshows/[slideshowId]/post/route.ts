/**
 * POST /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/post — the editor's "Post to TikTok":
 * { workspaceId, privacyLevel, allowComments, brandOrganic, brandContent, consent: true } → approve and send now.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../../../src/server/admin/route';
import { postSlideshowNow } from '../../../../../../../../../src/server/autoSlideshow/posting';
import { HttpError } from '../../../../../../../../../src/server/http';

export const maxDuration = 60;

type Ctx = { params: Promise<{ runId: string; slideshowId: string }> };

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId, slideshowId } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.workspaceId !== 'string' || !b.workspaceId) throw new HttpError(400, 'no_workspace', 'Pick the TikTok account to post with.');
  if (typeof b.privacyLevel !== 'string') throw new HttpError(400, 'bad_privacy', 'Pick who can see the post.');
  const post = await postSlideshowNow(runId, slideshowId, {
    workspaceId: b.workspaceId,
    privacyLevel: b.privacyLevel,
    allowComments: b.allowComments !== false,
    brandOrganic: b.brandOrganic === true,
    brandContent: b.brandContent === true,
    consent: b.consent === true,
  });
  return json({ post });
});
