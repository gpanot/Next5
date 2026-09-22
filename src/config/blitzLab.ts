/**
 * Blitz Lab configuration — shared between server routes and UI.
 * No secrets here.
 */

/** Default video duration in seconds (5 s @ 30 fps = 150 frames). */
export const BLITZ_DEFAULT_DURATION_S = 5.0;

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
  font: 'Arial, sans-serif',
  positionY: 0.15,       // caption bottom edge at 15 % of canvas height from the top
  fontSize: 52,
  safeZonePadding: 48,
  fontWeight: 700,
  color: '#ffffff',
  strokeWidth: 3,
  strokeColor: '#000000',
  offsetX: 0,
};

export type BlitzAssetType = 'BACKGROUND' | 'OVERLAY' | 'AUDIO';
export const BLITZ_ASSET_TYPES: BlitzAssetType[] = ['BACKGROUND', 'OVERLAY', 'AUDIO'];

/** Human-readable label for each layer in the Assets panel. */
export const BLITZ_LAYER_LABELS: Record<string, string> = {
  OVERLAY: 'Meme Video',
  BACKGROUND: 'Background',
  AUDIO: 'Audio',
};
