/**
 * POST /api/slideshow/campaigns/[campaignId]/generate — called by Schedule: makes one slideshow per hook line when the
 *      draft changed since the last make (replacing the earlier ones, unless any is scheduled or posted), else only
 *      copies the caption onto them → { count, campaign }. Free: no AI writing, no credits.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { generateCampaign } from '../../../../../../src/server/autoSlideshow/campaign/generate';
import { getCampaignDto } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

export const maxDuration = 300;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  await enforceRateLimit(`campaign-generate:${user.userId}`, 60, 3600);
  const count = await generateCampaign(user, campaignId);
  return NextResponse.json({ count, campaign: await getCampaignDto(campaignId) });
});
