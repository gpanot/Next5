import type { AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { hookPhotoFor, type CampaignDraft, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import type { HookStyleId } from '../../../../types/hookStyle';

/** One slide as the preview shows it: the rendered image once made, else the photo with the draft's text on top. */
export type PreviewSlide =
  | { kind: 'rendered'; imageUrl: string }
  | { kind: 'draft'; photoUrl: string | null; role: 'hook' | 'item' | 'cta'; title: string; body: string; look: HookStyleId };

export type PreviewShow = { hook: string; slides: PreviewSlide[] };

/** The draft's slideshows, one per hook (a single placeholder one before any hook is written). */
const draftShows = (draft: CampaignDraft, photos: CampaignPhotoDto[]): PreviewShow[] => {
  const photo = (i: number | null) => (i === null ? null : photos[i]?.fullUrl ?? photos[i]?.url ?? null);
  const cards = draft.cards.map((c): PreviewSlide => ({ kind: 'draft', photoUrl: photo(c.photo), role: c.role, title: c.title, body: c.body, look: draft.look }));
  const hooks = draft.hooks.length > 0 ? draft.hooks : [''];
  return hooks.map((hook, i) => ({ hook, slides: [{ kind: 'draft', photoUrl: photo(hookPhotoFor(draft, i)), role: 'hook', title: hook, body: '', look: draft.look }, ...cards] }));
};

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
