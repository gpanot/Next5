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
  /** 0–1 fraction: the caption bottom edge is at (positionY × canvasHeight) from the top */
  positionY: number;
  /** px at full 1080-wide canvas */
  fontSize: number;
  /** horizontal padding inside the safe zone, px at 1080-wide canvas */
  safeZonePadding: number;
  /** CSS font-weight (100–900). Default 600. */
  fontWeight?: number;
  /** CSS color string, e.g. "#ffffff". Default white. */
  color?: string;
  /** Text stroke width in canvas px. Default 3. */
  strokeWidth?: number;
  /** Text stroke color string, e.g. "#000000". Default black. */
  strokeColor?: string;
  /** Horizontal offset in canvas px; positive = right. Default 0. */
  offsetX?: number;
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
