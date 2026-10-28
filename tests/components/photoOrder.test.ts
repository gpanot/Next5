import { describe, expect, it } from 'vitest';
import { photosForPicker } from '../../src/components/admin/autoSlideshow/photoOrder';
import { swapPerson } from '../../src/components/admin/autoSlideshow/NewPhotoDialog';

const photo = (index: number, showId: string | null = null, url: string | null = `u${index}`) => ({ index, prompt: '', url, showId });

describe('photosForPicker', () => {
  it('keeps the slideshow photos in the order they were made, whichever slide uses them, each photo once', () => {
    const photos = [photo(0), photo(1, 'a'), photo(2), photo(3, 'b'), photo(4, 'a'), photo(5, 'a', null), photo(6)];
    const slides = [{ photoIndex: 4 }, { photoIndex: 2 }, { photoIndex: 4 }, { photoIndex: 5 }, { photoIndex: 0 }];
    expect(photosForPicker('a', slides, photos).map((p) => p.index)).toEqual([0, 1, 2, 4]);
  });

  it('does not reorder when a slide picks another photo', () => {
    const photos = [photo(0), photo(1), photo(2, 'a')];
    const before = photosForPicker('a', [{ photoIndex: 0 }, { photoIndex: 1 }], photos).map((p) => p.index);
    const after = photosForPicker('a', [{ photoIndex: 1 }, { photoIndex: 0 }], photos).map((p) => p.index);
    expect(after).toEqual(before);
  });
});

describe('swapPerson', () => {
  const maya = { id: 'm', name: 'Maya, 32', look: '32 years old, dark hair. Everyday style: denim.', imageUrl: '' };
  const leo = { id: 'l', name: 'Leo, 30', look: '30 years old, short hair.', imageUrl: '' };

  it('swaps the described person, without the anchor photo outfit', () => {
    expect(swapPerson('A kitchen. The main person: 32 years old, dark hair. Wearing a polo.', maya, leo)).toBe('A kitchen. The main person: 30 years old, short hair. Wearing a polo.');
  });

  it('drops the person for no avatar, and adds one when the prompt had none', () => {
    expect(swapPerson('A kitchen. The main person: 32 years old, dark hair.', maya, undefined)).toBe('A kitchen.');
    expect(swapPerson('A kitchen.', undefined, leo)).toBe('A kitchen. The main person: 30 years old, short hair.');
  });
});
