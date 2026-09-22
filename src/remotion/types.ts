/**
 * Shared types for the Blitz Lab Remotion composition.
 * Imported by:
 *   - GreenScreenComposition.tsx   (Remotion component)
 *   - Root.tsx                     (Remotion entry)
 *   - BlitzLabTab.tsx              (browser player inputProps)
 *   - blitz-worker/src/render.ts   (server-side renderMedia inputProps)
 */

export type TextConfig = {
  /** CSS font-family, e.g. "sans-serif" */
  font: string;
  /** 0–1 fraction of canvas height where the caption baseline sits */
  positionY: number;
  /** px at full 1080-wide canvas */
  fontSize: number;
  /** horizontal padding inside the safe zone, px at 1080-wide canvas */
  safeZonePadding: number;
};

export type GreenScreenProps = {
  /** Fully-resolved URL: signed R2 URL in browser, file:// URI in worker */
  backgroundUrl: string;
  /** Fully-resolved URL — must be pre-keyed VP9-alpha WebM */
  overlayUrl: string;
  /** Optional audio track URL */
  audioUrl?: string;
  /** Caption shown on top layer */
  captionText: string;
  /** Zoom multiplier for the overlay; 1.0 = 100 % */
  overlayZoom: number;
  /** Horizontal offset in canvas px (1080-wide); positive = right */
  overlayOffsetX: number;
  /** Vertical offset in canvas px (1920-tall); positive = down */
  overlayOffsetY: number;
  textConfig: TextConfig;
  /** template.durationSeconds × template.fps */
  durationInFrames: number;
  fps: number;
};
