'use client';

/**
 * Slideshow timing — always fixed-duration per slide.
 *
 * Every slide holds for `secondsPerSlide` seconds regardless of whether its
 * background is a still image or a video clip. Video backgrounds are trimmed
 * (or held on the last frame) by the Remotion Sequence window — the user sets
 * the pace via the ± stepper, not the footage length.
 */

import {
  BLITZ_SLIDESHOW_MAX_DURATION_S,
  BLITZ_SLIDESHOW_SECONDS_MAX,
  BLITZ_SLIDESHOW_SECONDS_MIN,
  clampBlitzDuration,
} from '../../../../config/blitzLab';
import type { SlideData } from './SlidePreview';

export type SlideshowMode = 'slideshow';

export type SlideshowModeResult = {
  mode: SlideshowMode;
  /** Always empty — kept for API compatibility. */
  videoSlideNumbers: number[];
  /** Clip length to submit, in seconds (slideCount × secondsPerSlide). */
  durationSeconds: number;
};

/** Clamp the per-slide hold to the allowed range. */
export const clampSecondsPerSlide = (seconds: number): number =>
  Math.min(BLITZ_SLIDESHOW_SECONDS_MAX, Math.max(BLITZ_SLIDESHOW_SECONDS_MIN, Math.round(seconds)));

/**
 * Compute slideshow duration.
 * The `assets` and `clipSeconds` parameters are no longer used but kept so
 * call-sites don't need updating.
 */
export function resolveSlideshowMode(
  slides: SlideData[],
  _assets: unknown,
  _fallbackBackgroundKey: unknown,
  secondsPerSlide: number,
  _clipSeconds?: unknown,
): SlideshowModeResult {
  const filled = slides.filter((s) => s.text.trim());
  const slideCount = Math.max(1, filled.length);
  const durationSeconds = clampBlitzDuration(
    slideCount * clampSecondsPerSlide(secondsPerSlide),
    BLITZ_SLIDESHOW_MAX_DURATION_S,
  );

  return { mode: 'slideshow', videoSlideNumbers: [], durationSeconds };
}
