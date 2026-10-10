import { describe, expect, it } from 'vitest';
import { photosInSlideOrder } from '../../src/components/admin/autoSlideshow/photoOrder';

const photo = (index: number, showId: string | null = null, url: string | null = `u${index}`) => ({ index, prompt: '', url, showId });

describe('photosInSlideOrder', () => {
  it('puts the slideshow photos first in slide order, then its own other photos, each photo once', () => {
    const photos = [photo(0), photo(1, 'a'), photo(2), photo(3, 'b'), photo(4, 'a'), photo(5, 'a', null), photo(6)];
    const slides = [{ photoIndex: 4 }, { photoIndex: 2 }, { photoIndex: 4 }, { photoIndex: 5 }, { photoIndex: 0 }];
    expect(photosInSlideOrder('a', slides, photos).map((o) => [o.photo.index, o.slide])).toEqual([[4, 1], [2, 2], [0, 5], [1, null]]);
  });
});
