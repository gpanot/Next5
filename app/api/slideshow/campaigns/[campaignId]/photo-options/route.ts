/**
 * GET /api/slideshow/campaigns/[campaignId]/photo-options?tab=search|generated|brand|shared&q=&page= — one tab of the
 *     photo picker: Unsplash results for `q`, or the workspace's generated photos, brand photos, or the shared library.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { photoOptions } from '../../../../../../src/server/autoSlideshow/campaign/photos';
import { loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import type { PhotoTab } from '../../../../../../src/types/admin/slideshowCampaign';

type Ctx = { params: Promise<{ campaignId: string }> };

const TABS: PhotoTab[] = ['search', 'generated', 'brand', 'shared'];

export const GET = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  const params = new URL(req.url).searchParams;
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'search';
  // Unsplash allows 50 searches an hour in demo mode, 5,000 once approved: keep one person from using them all.
  if (tab === 'search') await enforceRateLimit(`unsplash-search:${user.userId}`, 60, 3600);
  const page = Math.max(1, Math.min(50, Number(params.get('page')) || 1));
  return NextResponse.json(await photoOptions(run.workspaceId!, tab, params.get('q') ?? '', page));
});
