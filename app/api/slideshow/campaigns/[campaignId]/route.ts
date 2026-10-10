/**
 * GET    /api/slideshow/campaigns/[campaignId] — the campaign: name, draft, photos, generated slideshows
 * PATCH  /api/slideshow/campaigns/[campaignId] — { name?, draft? } → saved (the draft is cleaned, see campaign/store.ts)
 * DELETE /api/slideshow/campaigns/[campaignId] — the campaign, its slideshows and their posts
 */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { requireUser } from '../../../../../src/server/autoSlideshow/access';
import { getCampaignDto, loadCampaign, saveCampaign } from '../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';

type Ctx = { params: Promise<{ campaignId: string }> };

export const GET = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  await loadCampaign(requireUser(access), campaignId);
  return NextResponse.json({ campaign: await getCampaignDto(campaignId) });
});

export const PATCH = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; draft?: unknown };
  await saveCampaign(requireUser(access), campaignId, { name: body.name, draft: body.draft });
  return NextResponse.json({ ok: true });
});

export const DELETE = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  await loadCampaign(requireUser(access), campaignId);
  await prisma.autoSlideshowRun.delete({ where: { id: campaignId } });
  return NextResponse.json({ ok: true });
});
