import type { AutoPhotoDto } from '../../../types/admin/autoSlideshow';

/**
 * The photo picker's photos: the ones this slideshow's slides use, and the other photos made for it (earlier "New"
 * photos, replaced slide photos), in the order they were made. The order never depends on which slide uses which photo,
 * so picking one does not shuffle the row. Photos of the run's other slideshows and its shared pool stay out.
 */
export const photosForPicker = (showId: string, slides: ReadonlyArray<{ photoIndex: number }>, photos: AutoPhotoDto[]): AutoPhotoDto[] => {
  const used = new Set(slides.map((s) => s.photoIndex));
  return photos.filter((p) => p.url && (used.has(p.index) || p.showId === showId)).sort((a, b) => a.index - b.index);
};
