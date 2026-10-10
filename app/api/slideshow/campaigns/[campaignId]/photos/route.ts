/**
 * POST /api/slideshow/campaigns/[campaignId]/photos — { ref } (a generated, brand, shared or Unsplash photo) → the photo
 *      is copied into the campaign → { index, campaign }. The client then puts the index on the hook or a card.
 */
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { importPhoto, parsePhotoRef } from '../../../../../../src/server/autoSlideshow/campaign/photos';
import { getCampaignDto, loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

export const maxDuration = 60;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-photo:${user.userId}`, 300, 3600);
  const body = (await req.json().catch(() => ({}))) as { ref?: unknown };
  const { index, detect } = await importPhoto(campaignId, run.workspaceId!, parsePhotoRef(body.ref));
  waitUntil(detect().catch(() => undefined));
  return NextResponse.json({ index, campaign: await getCampaignDto(campaignId) });
});
