/**
 * POST /api/slideshow/campaigns/[campaignId]/app-shot/scene — { scene } → an AI background of the scene → { asset }.
 *      The only App shot step that calls an image model.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../../src/server/autoSlideshow/access';
import { generateAppScene } from '../../../../../../../src/server/autoSlideshow/campaign/appShot/store';
import { parseScene } from '../../../../../../../src/server/autoSlideshow/campaign/appShot/request';
import { loadCampaign } from '../../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../../src/server/rateLimit';

export const maxDuration = 300;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-app-scene:${user.userId}`, 30, 3600);
  const body = (await req.json().catch(() => ({}))) as { scene?: unknown };
  return NextResponse.json({ asset: await generateAppScene(run.workspaceId!, parseScene(body.scene)) });
});
