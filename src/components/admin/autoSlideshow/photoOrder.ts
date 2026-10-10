import type { AutoPhotoDto } from '../../../types/admin/autoSlideshow';

export type OrderedPhoto = { photo: AutoPhotoDto; /** 1-based slide that uses it in this slideshow; first one when several do. */ slide: number | null };

/**
 * The photo picker's order: this slideshow's photos in slide order (1, 2, 3…), then the other photos made for it
 * (earlier "New" photos, replaced slide photos). Photos of the run's other slideshows and its shared pool stay out.
 */
export const photosInSlideOrder = (showId: string, slides: ReadonlyArray<{ photoIndex: number }>, photos: AutoPhotoDto[]): OrderedPhoto[] => {
  const usable = photos.filter((p) => p.url);
  const byIndex = new Map(usable.map((p) => [p.index, p]));
  const own: OrderedPhoto[] = [];
  slides.forEach((s, i) => {
    const photo = byIndex.get(s.photoIndex);
    if (photo && !own.some((o) => o.photo.index === photo.index)) own.push({ photo, slide: i + 1 });
  });
  const ownIds = new Set(own.map((o) => o.photo.index));
  const alternatives = usable.filter((p) => p.showId === showId && !ownIds.has(p.index)).map((photo) => ({ photo, slide: null }));
  return [...own, ...alternatives];
};
