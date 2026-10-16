/**
 * POST /api/slideshow/campaigns/[campaignId]/hooks — the Hook tab's "Generate for me": { count: 2-6, cards? } →
 *      { hooks, photoQuery }. Written from the brand, the content slides and the admins' Hook Knowledge; `photoQuery` is
 *      the hook photos' stock search. Nothing is saved: the editor puts both in the draft (one slideshow per hook).
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { draftOf, loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { writeCampaignHooks } from '../../../../../../src/server/autoSlideshow/campaign/writeHooks';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { MAX_CARD_TITLE_CHARS, type CampaignCard } from '../../../../../../src/types/admin/slideshowCampaign';

export const maxDuration = 120;

type Ctx = { params: Promise<{ campaignId: string }> };

/** The editor's content slides (the saved draft may be a moment behind), titles only. */
const cardsOf = (value: unknown): CampaignCard[] | null =>
  Array.isArray(value)
    ? value.flatMap((c) => {
        const r = (c ?? {}) as Record<string, unknown>;
        return r.role === 'item' && typeof r.title === 'string' ? [{ role: 'item' as const, title: r.title.slice(0, MAX_CARD_TITLE_CHARS), body: '', photo: null }] : [];
      })
    : null;

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-hooks:${user.userId}`, 30, 3600);
  const raw = (await req.json().catch(() => ({}))) as { count?: unknown; cards?: unknown };
  const draft = draftOf(run);
  const cards = cardsOf(raw.cards) ?? draft.cards;
  const { hooks, photoQuery } = await writeCampaignHooks(run.workspaceId!, run.id, run.name ?? 'Campaign', { ...draft, cards }, Number(raw.count));
  return NextResponse.json({ hooks, photoQuery });
});
