/**
 * POST   /api/slideshow/campaigns/[campaignId]/auto-photos — { jobs: [{ key, cards, auto | ref }] } → the Content "Auto"
 *        photos are made in the background (AI, stock, or a matched library photo copied in) → { ok }. The editor
 *        reads their state in the campaign's `photoJobs`, so they keep coming when it is closed.
 * DELETE /api/slideshow/campaigns/[campaignId]/auto-photos?keys=a,b — clears jobs the editor has put on their cards.
 */
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { clearPhotoJobs, parsePhotoJobs, startPhotoJobs } from '../../../../../../src/server/autoSlideshow/campaign/photoJobs';
import { loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

// The photos are made after the response, within this time.
export const maxDuration = 300;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  const body = (await req.json().catch(() => ({}))) as { jobs?: unknown };
  const jobs = parsePhotoJobs(body.jobs);
  for (let i = 0; i < jobs.length; i += 1) await enforceRateLimit(`campaign-auto-photo:${user.userId}`, 200, 3600);
  waitUntil((await startPhotoJobs(campaignId, run.workspaceId!, jobs))());
  return NextResponse.json({ ok: true });
});

export const DELETE = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  await loadCampaign(requireUser(access), campaignId);
  const keys = (new URL(req.url).searchParams.get('keys') ?? '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 50);
  await clearPhotoJobs(campaignId, keys);
  return NextResponse.json({ ok: true });
});
