/**
 * POST /api/slideshow/campaigns/[campaignId]/photo-query — { hooks } → { photoQuery }: the hook photos' stock search,
 *      for hooks written by hand (generated hooks come with one). Nothing is saved: the editor puts it in the draft.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { writeHookPhotoQuery } from '../../../../../../src/server/autoSlideshow/campaign/writeHooks';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { MAX_CAMPAIGN_HOOKS, MAX_HOOK_CHARS } from '../../../../../../src/types/admin/slideshowCampaign';
import { HttpError } from '../../../../../../src/server/http';

export const maxDuration = 60;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-photo-query:${user.userId}`, 60, 3600);
  const raw = (await req.json().catch(() => ({}))) as { hooks?: unknown };
  const hooks = (Array.isArray(raw.hooks) ? raw.hooks : []).filter((h): h is string => typeof h === 'string' && h.trim() !== '').map((h) => h.slice(0, MAX_HOOK_CHARS)).slice(0, MAX_CAMPAIGN_HOOKS);
  if (hooks.length === 0) throw new HttpError(400, 'no_hooks', 'Write a hook first.');
  return NextResponse.json({ photoQuery: await writeHookPhotoQuery(run.workspaceId!, run.name ?? 'Campaign', hooks) });
});
