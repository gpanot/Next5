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
  /** Business line: bottom edge as a fraction of canvas height. Default 0.9. */
  businessPositionY?: number;
  /** Business line: horizontal offset in canvas px. Default 0. */
  businessOffsetX?: number;
  /** Business line font size in canvas px. Default 40. */
  businessFontSize?: number;
};

export type GreenScreenProps = {
  /** Fully-resolved URL: signed R2 URL in browser, file:// URI in worker */
  backgroundUrl: string;
  /** Force image vs video for the background. Needed for blob: URLs, which have no extension. */
  backgroundIsImage?: boolean;
  /** Fully-resolved URL — must be pre-keyed VP9-alpha WebM */
  overlayUrl: string;
  /** Optional audio track URL */
  audioUrl?: string;
  /** Silence the sound of the background and meme videos (e.g. when a music track is used). */
  muteVideoAudio?: boolean;
  /** Business line shown as a pill (e.g. "Sarah Lee · Keller Williams · 555-0100"). Empty = hidden. */
  businessText?: string;
  /** Caption shown on top layer */
  captionText: string;
  /** Zoom multiplier for the overlay; 1.0 = 100 % */
  overlayZoom: number;
  /** Horizontal offset in canvas px (1080-wide); positive = right */
  overlayOffsetX: number;
  /** Vertical offset in canvas px (1920-tall); positive = down */
  overlayOffsetY: number;
  textConfig: TextConfig;
  /** Clip length in frames: the shortest video layer (see blitzDuration), else the template length. */
  durationInFrames: number;
  fps: number;
};
