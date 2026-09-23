/**
 * Blitz Lab configuration — shared between server routes and UI.
 * No secrets here.
 */

/** Default video duration in seconds (5 s @ 30 fps = 150 frames). Used until clip lengths are known. */
export const BLITZ_DEFAULT_DURATION_S = 5.0;

/**
 * Clip length = shortest video layer (meme or background video), clamped to this range.
 * Audio and images never set the length.
 *
 * This cap is about footage: a long background video should not quietly turn
 * into a long, expensive render. A still-image slideshow has no footage to
 * follow, so it gets its own, higher cap — see BLITZ_SLIDESHOW_MAX_DURATION_S.
 */
export const BLITZ_MIN_DURATION_S = 1;
export const BLITZ_MAX_DURATION_S = 60;

/** Longest business line, in characters. */
export const BLITZ_BUSINESS_TEXT_MAX = 80;

/** Default frames-per-second. */
export const BLITZ_DEFAULT_FPS = 30;

/** How many frames before the end the audio fade begins. */
export const BLITZ_AUDIO_FADE_FRAMES = 15;

/** How often the browser polls for render completion (ms). */
export const BLITZ_POLL_INTERVAL_MS = 4_000;

/** Give up polling after this long (worker down, job stuck). */
export const BLITZ_RENDER_TIMEOUT_MS = 5 * 60_000;

/** Remotion canvas resolution. */
export const BLITZ_CANVAS_WIDTH = 1080;
export const BLITZ_CANVAS_HEIGHT = 1920;

/** Default textConfig baked into new templates. */
export const BLITZ_DEFAULT_TEXT_CONFIG = {
  font: 'Montserrat', // resolved to the bundled font by resolveBlitzFont()
  positionY: 0.15,       // caption bottom edge at 15 % of canvas height from the top
  fontSize: 52,
  safeZonePadding: 48,
  fontWeight: 700,
  color: '#ffffff',
  strokeWidth: 3,
  strokeColor: '#000000',
  offsetX: 0,
};

/**
 * Initial text-style overrides for the Slideshow (CAROUSEL) tab.
 * Applied on top of the template's stored textConfig — user can still adjust via ContextPanel.
 * 88 px gives a bold card-style look; positionY 0.5 centres the text block on the slide.
 */
export const BLITZ_SLIDESHOW_TEXT_DEFAULTS = {
  fontSize: 88,
  positionY: 0.5,
} as const;

/**
 * Slideshow timing.
 *
 * A slideshow whose every background is a still image is a real slideshow: the
 * user sets how long each card holds, and the clip length follows from the
 * slide count. Only when a slide carries footage does the clip length come from
 * the video instead (see BlitzSlideshowTab).
 */
export const BLITZ_SLIDESHOW_SECONDS_PER_SLIDE = 3;
export const BLITZ_SLIDESHOW_SECONDS_MIN = 1;
export const BLITZ_SLIDESHOW_SECONDS_MAX = 10;

/**
 * Longest still-image slideshow, in seconds.
 *
 * Covers the most the editor can ask for — 10 slides at 10 s each — so the
 * stepper never promises a length the render then silently truncates. Applies
 * to CAROUSEL renders only; anything driven by footage stays on
 * BLITZ_MAX_DURATION_S.
 */
export const BLITZ_SLIDESHOW_MAX_DURATION_S = 100;

export type BlitzAssetType = 'BACKGROUND' | 'OVERLAY' | 'AUDIO';
export const BLITZ_ASSET_TYPES: BlitzAssetType[] = ['BACKGROUND', 'OVERLAY', 'AUDIO'];

/**
 * Clamp a clip length (seconds) to the allowed range.
 *
 * @param maxSeconds - the ceiling to use. Defaults to the footage cap; pass
 *   BLITZ_SLIDESHOW_MAX_DURATION_S for a still-image slideshow.
 */
export const clampBlitzDuration = (seconds: number, maxSeconds: number = BLITZ_MAX_DURATION_S): number =>
  Math.min(maxSeconds, Math.max(BLITZ_MIN_DURATION_S, seconds));

/** Human-readable label for each layer in the Assets panel. */
export const BLITZ_LAYER_LABELS: Record<string, string> = {
  OVERLAY: 'Meme Video',
  BACKGROUND: 'Background',
  AUDIO: 'Audio',
};
