/**
 * POST /api/slideshow/campaigns/[campaignId]/auto — the Content tab's "Auto": { prompt, format, length, tone,
 *      research, samePhoto, photoSource, hooks } → the content slides written in the hook lines' context (as many as the hook promises, else
 *      3-15 picked by the writer) → { titles,
 *      scenes, queries, coverScene, coverQuery, libraryRefs, coverRef }. Costs 1 credit per slide, charged once written
 *      (the balance is checked first). Nothing is saved: the editor puts the titles on the cards, then adds each photo.
 */
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { parseAutoRequest, writeAutoContent } from '../../../../../../src/server/autoSlideshow/campaign/autoContent';
import { draftOf, loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { matchLibrary } from '../../../../../../src/server/autoSlideshow/campaign/stockMatch';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { affordableCredits, chargeCredits, requireCredits } from '../../../../../../src/server/slideshowCredits/charge';
import { AUTO_MIN_SLIDES, autoSlideCount, MAX_CAMPAIGN_HOOKS, MAX_HOOK_CHARS, type AutoContentDto } from '../../../../../../src/types/admin/slideshowCampaign';

export const maxDuration = 300;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-auto:${user.userId}`, 60, 3600);
  const raw = (await req.json().catch(() => ({}))) as { hooks?: unknown };
  // The editor sends its hook lines (the saved draft may be a moment behind); the stored ones otherwise.
  const hooks = Array.isArray(raw.hooks) ? raw.hooks.filter((h): h is string => typeof h === 'string').map((h) => h.slice(0, MAX_HOOK_CHARS)).slice(0, MAX_CAMPAIGN_HOOKS) : draftOf(run).hooks;
  const request = parseAutoRequest(raw);
  // The hook's number fixes the count; otherwise the writer picks 3-15, capped to what the balance covers.
  await requireCredits(user.userId, autoSlideCount(hooks) ?? AUTO_MIN_SLIDES, 'slide');
  const written = await writeAutoContent(request, hooks, await affordableCredits(user.userId));
  const count = written.titles.length;
  const stock = request.photoSource === 'stock' ? await matchLibrary(run.workspaceId!, written.queries, written.coverQuery) : { libraryRefs: written.titles.map(() => null), coverRef: null };
  await chargeCredits(user.userId, count, `campaign-auto:${campaignId}:${randomUUID()}`, `Campaign: ${count} auto slides`);
  return NextResponse.json({ ...written, ...stock } satisfies AutoContentDto);
});
