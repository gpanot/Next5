import { describe, expect, it } from 'vitest';
import {
  clampSecondsPerSlide,
  resolveSlideshowMode,
} from '../../src/components/labs/blitzLab/useSlideshowMode';
import type { BlitzAssetDto } from '../../src/components/labs/blitzLab/api';
import { BLITZ_SLIDESHOW_MAX_DURATION_S } from '../../src/config/blitzLab';

const asset = (r2Key: string, mediaKind: 'image' | 'video'): BlitzAssetDto =>
  ({ id: r2Key, r2Key, mediaKind, name: r2Key, type: 'BACKGROUND', url: `https://r2/${r2Key}` } as BlitzAssetDto);

const ASSETS = [asset('img-a', 'image'), asset('img-b', 'image'), asset('clip', 'video')];
const slide = (text: string, backgroundKey?: string) => ({ text, backgroundKey });

describe('resolveSlideshowMode', () => {
  it('is a slideshow when every background is a still image, timed by the slide count', () => {
    const result = resolveSlideshowMode(
      [slide('one', 'img-a'), slide('two', 'img-b'), slide('three', 'img-a')],
      ASSETS,
      'img-a',
      3,
      99,
    );
    expect(result.mode).toBe('slideshow');
    expect(result.videoSlideNumbers).toEqual([]);
    expect(result.durationSeconds).toBe(9); // 3 slides x 3 s, not the 99 s clip
  });

  it('times footage backgrounds by the slide count too, never by the clip length', () => {
    const footage = resolveSlideshowMode([slide('one'), slide('two')], ASSETS, 'clip', 4, 12.5);
    expect(footage.mode).toBe('slideshow');
    expect(footage.videoSlideNumbers).toEqual([]);
    expect(footage.durationSeconds).toBe(8); // 2 slides x 4 s; the clip is trimmed or held per slide

    const mixed = resolveSlideshowMode([slide('one', 'img-a'), slide('two', 'clip'), slide('three', 'img-b')], ASSETS, 'img-a', 3, 7.5);
    expect(mixed.mode).toBe('slideshow');
    expect(mixed.durationSeconds).toBe(9);
  });

  it('counts only slides that have text', () => {
    const result = resolveSlideshowMode(
      [slide('one', 'img-a'), slide('   ', 'clip'), slide('three', 'clip')],
      ASSETS,
      'img-a',
      2,
      6,
    );
    expect(result.durationSeconds).toBe(4); // the blank slide is dropped: 2 slides x 2 s
  });

  it('ignores a background still uploading rather than guessing its kind', () => {
    const result = resolveSlideshowMode([slide('one', 'local:pending')], ASSETS, '', 3, 20);
    expect(result.mode).toBe('slideshow');
  });

  it('lets a still-image slideshow run past the 60 s footage cap', () => {
    // The stepper's ceiling is 10 slides x 10 s. The editor must be able to
    // deliver what it offers, so the full 100 s survives.
    const tenSlides = Array.from({ length: 10 }, (_, i) => slide(`slide ${i}`, 'img-a'));
    const result = resolveSlideshowMode(tenSlides, ASSETS, 'img-a', 10, 5);
    expect(result.durationSeconds).toBe(BLITZ_SLIDESHOW_MAX_DURATION_S);
    expect(result.durationSeconds).toBe(100);
  });

  it('still caps a slideshow that somehow asks for more than the slideshow ceiling', () => {
    const many = Array.from({ length: 40 }, (_, i) => slide(`slide ${i}`, 'img-a'));
    expect(resolveSlideshowMode(many, ASSETS, 'img-a', 10, 5).durationSeconds)
      .toBe(BLITZ_SLIDESHOW_MAX_DURATION_S);
  });

  it('never returns a zero-length clip for an empty slide list', () => {
    const result = resolveSlideshowMode([], ASSETS, 'img-a', 3, 5);
    expect(result.durationSeconds).toBe(3);
  });
});

describe('clampSecondsPerSlide', () => {
  it('holds the stepper inside 1-10 whole seconds', () => {
    expect(clampSecondsPerSlide(0)).toBe(1);
    expect(clampSecondsPerSlide(11)).toBe(10);
    expect(clampSecondsPerSlide(3.4)).toBe(3);
  });
});
