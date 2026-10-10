// Which photos step 5 makes, and which photo each slide gets. Pure: no database, no image calls.
// Photo list = the run's shared pool (older runs) first, then one photo per slide that has its own description: every
// slide on bank runs, the hook slide on older runs. Bank photos are named by their slide, so two slideshows on the same
// bank meat (same descriptions) still get different images.

import type { AutoPhoto, AutoSlide } from '../../types/admin/autoSlideshow';

type Show = { id: string; slides: AutoSlide[]; bank: boolean };
type Entry = Pick<AutoPhoto, 'prompt' | 'kind' | 'owner' | 'refs' | 'refNote' | 'brandPhotoKey'>;

export const slideOwner = (showId: string, index: number) => `${showId}:${index}`;

/** True when `photo` is the one made for this slide. Older hook photos have no owner: matched by description. */
const isFor = (photo: Entry, show: Show, index: number, prompt: string) =>
  show.bank ? photo.owner === slideOwner(show.id, index) : photo.kind === 'hook' && photo.prompt === prompt;

/** A slide's reference images and brand photo, as photo fields (only the ones set). */
const specOf = (s: Pick<AutoSlide, 'photoRefs' | 'photoRefNote' | 'brandPhotoKey'>): Pick<Entry, 'refs' | 'refNote' | 'brandPhotoKey'> => ({
  ...(s.photoRefs?.length ? { refs: s.photoRefs, ...(s.photoRefNote ? { refNote: s.photoRefNote } : {}) } : {}),
  ...(s.brandPhotoKey ? { brandPhotoKey: s.brandPhotoKey } : {}),
});

/** The photos to make after the pool, keeping the ones already listed in their places (so made images stay matched). */
export const ownPhotoEntries = (pool: number, existing: AutoPhoto[], shows: Show[]): Entry[] => {
  const entries: Entry[] = existing.slice(pool).filter((p) => p.kind).map(({ prompt, kind, owner, refs, refNote, brandPhotoKey }) => ({ prompt, kind, ...(owner ? { owner } : {}), ...specOf({ photoRefs: refs, photoRefNote: refNote, brandPhotoKey }) }));
  for (const show of shows) {
    show.slides.forEach((slide, i) => {
      const prompt = slide.photoPrompt;
      if (!prompt || (!show.bank && i > 0) || entries.some((e) => isFor(e, show, i, prompt))) return;
      entries.push(show.bank ? { prompt, kind: 'slide', owner: slideOwner(show.id, i), ...specOf(slide) } : { prompt, kind: 'hook' });
    });
  }
  return entries;
};

/** Each slide pointed at its own photo when it was made; other slides keep their index (step 6 fills them from the pool). */
export const withOwnPhotos = (show: Show, photos: AutoPhoto[]): AutoSlide[] =>
  show.slides.map((slide, i) => {
    const prompt = slide.photoPrompt;
    if (!prompt) return slide;
    const index = photos.findIndex((p) => p.imageKey && isFor(p, show, i, prompt));
    return index < 0 ? slide : { ...slide, photoIndex: index };
  });

/** Photos listed but not tried yet: a time-boxed step 5 left them for its next invocation. */
export const photosPending = (photos: AutoPhoto[]): boolean => photos.some((p) => !p.imageKey && !p.error && !p.deleted);
