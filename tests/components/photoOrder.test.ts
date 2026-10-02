import { describe, expect, it } from 'vitest';
import { photosInSlideOrder } from '../../src/components/admin/autoSlideshow/photoOrder';

const photo = (index: number, url: string | null = `u${index}`) => ({ index, prompt: '', url });

describe('photosInSlideOrder', () => {
  it('puts the slideshow photos first in slide order, then the rest, each photo once', () => {
    const photos = [photo(0), photo(1), photo(2), photo(3), photo(4), photo(5, null)];
    const slides = [{ photoIndex: 4 }, { photoIndex: 2 }, { photoIndex: 4 }, { photoIndex: 5 }, { photoIndex: 0 }];
    expect(photosInSlideOrder(slides, photos).map((o) => [o.photo.index, o.slide])).toEqual([[4, 1], [2, 2], [0, 5], [1, null], [3, null]]);
  });
});
