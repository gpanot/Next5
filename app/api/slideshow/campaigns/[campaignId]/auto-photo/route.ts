/**
 * POST /api/slideshow/campaigns/[campaignId]/auto-photo — { source: 'ai', scene } or { source: 'stock', query, nth } →
 *      an AI photo made, or a stock photo found, and copied into the campaign → { photo }. The client puts it on its cards.
 */
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { autoPhoto, parseAutoPhoto } from '../../../../../../src/server/autoSlideshow/campaign/photos';
import { loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

export const maxDuration = 300;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-auto-photo:${user.userId}`, 200, 3600);
  const { photo, detect } = await autoPhoto(campaignId, parseAutoPhoto(await req.json().catch(() => ({}))));
  waitUntil(detect().catch(() => undefined));
  return NextResponse.json({ photo });
});
