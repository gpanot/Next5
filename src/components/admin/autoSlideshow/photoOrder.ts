import type { AutoPhotoDto } from '../../../types/admin/autoSlideshow';

export type OrderedPhoto = { photo: AutoPhotoDto; /** 1-based slide that uses it in this slideshow; first one when several do. */ slide: number | null };

/**
 * The photo picker's order: this slideshow's photos first, in slide order (1, 2, 3…), then the run's other photos.
 * The run's photo list mixes every slideshow's photos, so shown as stored it jumps around.
 */
export const photosInSlideOrder = (slides: ReadonlyArray<{ photoIndex: number }>, photos: AutoPhotoDto[]): OrderedPhoto[] => {
  const usable = photos.filter((p) => p.url);
  const byIndex = new Map(usable.map((p) => [p.index, p]));
  const own: OrderedPhoto[] = [];
  slides.forEach((s, i) => {
    const photo = byIndex.get(s.photoIndex);
    if (photo && !own.some((o) => o.photo.index === photo.index)) own.push({ photo, slide: i + 1 });
  });
  const ownIds = new Set(own.map((o) => o.photo.index));
  return [...own, ...usable.filter((p) => !ownIds.has(p.index)).map((photo) => ({ photo, slide: null }))];
};
