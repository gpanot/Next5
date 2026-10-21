import type { AutoSlideshowDto, HeadBox } from '../../../../types/admin/autoSlideshow';
import { cardPhotoFor, hookPhotoFor, lookOfRole, shownBody, type CampaignCard, type CampaignDraft, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import type { TextAt, TextLook } from '../../../../types/slideText';
import type { StoreBadge } from '../../../../types/storeBadges';
import { alignsWithContent, contentTop } from '../../../../server/autoSlideshow/textPlacement';

/** One slide as the preview shows it: the rendered image once made, else the photo with the draft's text on top.
 *  `alignTop`: the spot (px) every auto-placed content slide of the campaign shares, as the render puts it. */
export type PreviewSlide =
  | { kind: 'rendered'; imageUrl: string }
  | { kind: 'draft'; photoUrl: string | null; role: 'hook' | 'item' | 'cta'; title: string; body: string; look: TextLook; textAt?: TextAt; heads?: HeadBox[]; badges?: StoreBadge[]; badgesAt?: number; alignTop?: number };

type DraftSlide = Extract<PreviewSlide, { kind: 'draft' }>;

/** The draft slides with the content slides' shared spot (contentTop over every one of them, as generate.ts does). */
const aligned = (shows: PreviewShow[]): PreviewShow[] => {
  const drafts = shows.flatMap((s) => s.slides.filter((x): x is DraftSlide => x.kind === 'draft'));
  const top = contentTop(drafts.map((slide) => ({ slide, heads: slide.heads })));
  if (top === undefined) return shows;
  return shows.map((s) => ({ ...s, slides: s.slides.map((x) => (x.kind === 'draft' && alignsWithContent(x) ? { ...x, alignTop: top } : x)) }));
};

export type PreviewShow = { hook: string; slides: PreviewSlide[] };

/** What the draft preview reads of a photo (the list's covers pass thumbs only). */
type PhotoLike = Pick<CampaignPhotoDto, 'url' | 'fullUrl' | 'heads'>;

/** A card's store badges and their row's spot: the CTA only. */
export const badgesOf = (c: CampaignCard): { badges?: StoreBadge[]; badgesAt?: number } => (c.role === 'cta' ? { badges: c.badges, badgesAt: c.badgesAt } : {});

/** The faces in photo i, so the draft text keeps off them as the render will. */
export const headsOf = (photos: PhotoLike[], i: number | null | undefined): { heads?: HeadBox[] } => {
  const heads = i === null || i === undefined ? undefined : photos[i]?.heads;
  return heads ? { heads } : {};
};

/** The draft's slideshows, one per hook (a single placeholder one before any hook is written). */
export const draftShows = (draft: CampaignDraft, photos: PhotoLike[]): PreviewShow[] => {
  const photo = (i: number | null) => (i === null ? null : photos[i]?.fullUrl ?? photos[i]?.url ?? null);
  // Content cards with several photos show the one that goes with hook i.
  const cards = (i: number) => draft.cards.map((c): PreviewSlide => ({ kind: 'draft', photoUrl: photo(cardPhotoFor(c, i)), role: c.role, title: c.title, body: shownBody(c), look: lookOfRole(draft.looks, c.role), textAt: c.textAt, ...headsOf(photos, cardPhotoFor(c, i)), ...badgesOf(c) }));
  const hooks = draft.hooks.length > 0 ? draft.hooks : [''];
  return aligned(hooks.map((hook, i) => ({ hook, slides: [{ kind: 'draft', photoUrl: photo(hookPhotoFor(draft, i)), role: 'hook', title: hook, body: '', look: draft.looks.hook, textAt: draft.hookTextAt, ...headsOf(photos, hookPhotoFor(draft, i)) }, ...cards(i)] })));
};

/** The spot (px) the campaign's auto-placed content slides share; undefined when none is auto-placed. */
export const campaignContentTop = (draft: CampaignDraft, photos: PhotoLike[]): number | undefined =>
  draftShows(draft, photos).flatMap((s) => s.slides).find((x): x is DraftSlide => x.kind === 'draft' && x.alignTop !== undefined)?.alignTop;

/**
 * What the preview plays: the made slideshows as rendered, while they still match the draft; otherwise the draft
 * itself, drawn in the browser, so changes show before "Make".
 */
export const previewShows = (draft: CampaignDraft, photos: CampaignPhotoDto[], made: AutoSlideshowDto[], stale: boolean): { shows: PreviewShow[]; rendered: boolean } => {
  const ready = made.filter((s) => s.status === 'ready');
  if (!stale && ready.length > 0 && ready.every((s) => s.slides.every((x) => x.imageUrl))) {
    return { shows: ready.map((s) => ({ hook: s.topic, slides: s.slides.map((x) => ({ kind: 'rendered', imageUrl: x.imageUrl! })) })), rendered: true };
  }
  return { shows: draftShows(draft, photos), rendered: false };
};
