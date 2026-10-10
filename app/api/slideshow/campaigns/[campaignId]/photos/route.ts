/**
 * POST /api/slideshow/campaigns/[campaignId]/photos — { ref } (a generated, brand, shared or Unsplash photo) → the photo
 *      is copied into the campaign → { photo } (its index and thumb). The client then puts it on the hook or a card.
 */
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { importPhoto, parsePhotoRef } from '../../../../../../src/server/autoSlideshow/campaign/photos';
import { loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
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
  const { photo, detect } = await importPhoto(campaignId, run.workspaceId!, parsePhotoRef(body.ref));
  waitUntil(detect().catch(() => undefined));
  return NextResponse.json({ photo });
});
