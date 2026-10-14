/**
 * POST /api/slideshow/campaigns/[campaignId]/plan — { items: [{ position, at }] }: puts the campaign's posts on the
 *      Calendar at those times, where they wait for approval → { plan }. The slideshows must be made first (generate).
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { planCampaign } from '../../../../../../src/server/autoSlideshow/campaign/plan';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { items?: unknown };
  return NextResponse.json({ plan: await planCampaign(requireUser(access), campaignId, body.items) });
});
