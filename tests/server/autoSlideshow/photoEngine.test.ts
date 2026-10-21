import { afterEach, describe, expect, it } from 'vitest';
import { photoEngine } from '../../../src/server/autoSlideshow/photoRules';

describe('photoEngine', () => {
  afterEach(() => {
    delete process.env.SLIDESHOW_PHOTO_ENGINE;
  });

  it('starts with GPT Image 2.5 on reAPI, then WaveSpeed, and ends on Nano Banana', () => {
    expect(photoEngine()).toEqual(['reapi-gpt-2.5', 'wavespeed-gpt-2.5', 'reapi-nano-2.1']);
  });

  it('switches back to Nano Banana first with SLIDESHOW_PHOTO_ENGINE=nano', () => {
    process.env.SLIDESHOW_PHOTO_ENGINE = 'nano';
    expect(photoEngine()[0]).toBe('reapi-nano-2.1');
  });
});
