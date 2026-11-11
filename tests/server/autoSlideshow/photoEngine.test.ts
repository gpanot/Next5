import { afterEach, describe, expect, it } from 'vitest';
import { newPhotoSteps, photoEngine, photoSteps } from '../../../src/server/autoSlideshow/photoRules';

describe('photoEngine', () => {
  afterEach(() => {
    delete process.env.SLIDESHOW_PHOTO_ENGINE;
  });

  it('starts with Muse on reAPI, then GPT Image 2.5, and ends on Nano Banana', () => {
    expect(photoEngine()).toEqual(['reapi-muse', 'reapi-gpt-2.5', 'reapi-nano-2.1']);
  });

  it('gives "Generate New" the first model and one redo on GPT Image 2.5', () => {
    expect(newPhotoSteps([])).toEqual(['reapi-muse', 'reapi-gpt-2.5']);
  });

  it('skips Muse only for a Brand Cast avatar', () => {
    const avatar = 'https://x.r2.cloudflarestorage.com/brand-cast/w/m-1.jpg?sig=1';
    expect(photoSteps([avatar, 'uploads/product.jpg'])).toEqual(['reapi-gpt-2.5', 'reapi-nano-2.1']);
    expect(photoSteps(['uploads/product.jpg'])[0]).toBe('reapi-muse');
    expect(newPhotoSteps(['brand-cast/w/m-1.jpg'])).toEqual(['reapi-gpt-2.5', 'reapi-gpt-2.5']);
  });

  it('switches back to Nano Banana first with SLIDESHOW_PHOTO_ENGINE=nano', () => {
    process.env.SLIDESHOW_PHOTO_ENGINE = 'nano';
    expect(photoEngine()[0]).toBe('reapi-nano-2.1');
  });
});
