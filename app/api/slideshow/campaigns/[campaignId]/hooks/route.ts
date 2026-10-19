/**
 * POST /api/slideshow/campaigns/[campaignId]/hooks — the Hook tab's "Generate for me": { count: 2-6, cards? } →
 *      { hooks, photoQuery, photoSource, cta }. Written from the brand, the content slides and the admins' Hook Knowledge; `photoQuery` is
 *      the hook photos' stock search; `photoSource` is what "Generate the entire slideshows" makes the content photos with
 *      (stock until the owner has paid, or with the Hooks Volume stock-only testing switch), and `cta` the text it puts
 *      on an empty CTA card. Nothing is saved: the editor puts both in the draft (one slideshow per hook).
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { campaignCta } from '../../../../../../src/server/autoSlideshow/campaign/campaignCta';
import { draftOf, loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { writeCampaignHooks } from '../../../../../../src/server/autoSlideshow/campaign/writeHooks';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { workspaceHooksVolumeGetsAi } from '../../../../../../src/server/slideshowCredits/paid';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { MAX_CARD_TITLE_CHARS, type AutoPhotoSource, type CampaignCard } from '../../../../../../src/types/admin/slideshowCampaign';

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
  const [{ hooks, photoQuery }, ai, cta] = await Promise.all([
    writeCampaignHooks(run.workspaceId!, run.id, run.name ?? 'Campaign', { ...draft, cards }, Number(raw.count)),
    workspaceHooksVolumeGetsAi(run.workspaceId),
    campaignCta(run.workspaceId),
  ]);
  const photoSource: AutoPhotoSource = ai ? 'ai' : 'stock';
  return NextResponse.json({ hooks, photoQuery, photoSource, cta });
});
