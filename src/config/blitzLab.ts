/**
 * Blitz Lab configuration — shared between server routes and UI.
 * No secrets here.
 */

/** Default video duration in seconds (5 s @ 30 fps = 150 frames). Used until clip lengths are known. */
export const BLITZ_DEFAULT_DURATION_S = 5.0;

/**
 * Clip length = shortest video layer (meme or background video), clamped to this range.
 * Audio and images never set the length.
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

export type BlitzAssetType = 'BACKGROUND' | 'OVERLAY' | 'AUDIO';
export const BLITZ_ASSET_TYPES: BlitzAssetType[] = ['BACKGROUND', 'OVERLAY', 'AUDIO'];

/** Clamp a clip length (seconds) to the allowed range. */
export const clampBlitzDuration = (seconds: number): number =>
  Math.min(BLITZ_MAX_DURATION_S, Math.max(BLITZ_MIN_DURATION_S, seconds));

/** Human-readable label for each layer in the Assets panel. */
export const BLITZ_LAYER_LABELS: Record<string, string> = {
  OVERLAY: 'Meme Video',
  BACKGROUND: 'Background',
  AUDIO: 'Audio',
};
