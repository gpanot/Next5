'use client';

/**
 * Slideshow vs video mode.
 *
 * A Slideshow whose backgrounds are all still images is a real slideshow: every
 * card holds for the same chosen number of seconds, and the clip length is just
 * slides × secondsPerSlide. The moment one slide carries footage the output
 * stops being a slideshow and becomes an ordinary video, so the clip length has
 * to follow the footage instead — and the user is told before rendering.
 */

import {
  BLITZ_SLIDESHOW_MAX_DURATION_S,
  BLITZ_SLIDESHOW_SECONDS_MAX,
  BLITZ_SLIDESHOW_SECONDS_MIN,
  clampBlitzDuration,
} from '../../../../config/blitzLab';
import type { BlitzAssetDto } from './api';
import type { SlideData } from './SlidePreview';
import { isLocalKey } from './useBlitzUploads';

export type SlideshowMode = 'slideshow' | 'video';

export type SlideshowModeResult = {
  mode: SlideshowMode;
  /** 1-based slide numbers whose background is footage. Empty in slideshow mode. */
  videoSlideNumbers: number[];
  /** Clip length to submit, in seconds. */
  durationSeconds: number;
};

/** Clamp the per-slide hold to the allowed range. */
export const clampSecondsPerSlide = (seconds: number): number =>
  Math.min(BLITZ_SLIDESHOW_SECONDS_MAX, Math.max(BLITZ_SLIDESHOW_SECONDS_MIN, Math.round(seconds)));

/**
 * Which slides carry footage, and how long the clip should be.
 *
 * @param clipSeconds - length measured from the background videos, used in video mode.
 */
export function resolveSlideshowMode(
  slides: SlideData[],
  assets: BlitzAssetDto[],
  fallbackBackgroundKey: string,
  secondsPerSlide: number,
  clipSeconds: number,
): SlideshowModeResult {
  const filled = slides.filter((s) => s.text.trim());

  const videoSlideNumbers = filled.reduce<number[]>((found, slide, index) => {
    const key = slide.backgroundKey || fallbackBackgroundKey;
    if (!key || isLocalKey(key)) return found;
    const asset = assets.find((a) => a.r2Key === key);
    if (asset?.mediaKind === 'video') found.push(index + 1);
    return found;
  }, []);

  const mode: SlideshowMode = videoSlideNumbers.length > 0 ? 'video' : 'slideshow';
  const slideCount = Math.max(1, filled.length);
  const durationSeconds = mode === 'slideshow'
    ? clampBlitzDuration(slideCount * clampSecondsPerSlide(secondsPerSlide), BLITZ_SLIDESHOW_MAX_DURATION_S)
    : clipSeconds;

  return { mode, videoSlideNumbers, durationSeconds };
}
