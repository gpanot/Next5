'use client';

/**
 * Canvas hit testing for the Blitz Lab preview.
 *
 * The composition tags its layers with data-blitz-layer="TEXT" | "BUSINESS" | "OVERLAY".
 * We read their on-screen boxes from the DOM, so zoom, offsets, font size and
 * line wraps are all accounted for with no duplicated layout math.
 */

export type BlitzLayer = 'OVERLAY' | 'TEXT' | 'BUSINESS';

export type Box = { left: number; top: number; width: number; height: number };

/** Extra DOM px around the caption so thin text is easy to grab. */
const TEXT_HIT_PADDING = 8;

/** Visible content box of a <video> drawn with object-fit: contain. */
const containedBox = (video: HTMLVideoElement): Box => {
  const r = video.getBoundingClientRect();
  if (!video.videoWidth || !video.videoHeight) return r;
  const scale = Math.min(r.width / video.videoWidth, r.height / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  return { left: r.left + (r.width - width) / 2, top: r.top + (r.height - height) / 2, width, height };
};

/** Screen box of one layer, or null when the layer is not on the canvas. */
export const layerBox = (root: HTMLElement, layer: BlitzLayer): Box | null => {
  const el = root.querySelector<HTMLElement>(`[data-blitz-layer="${layer}"]`);
  if (!el) return null;
  if (layer !== 'OVERLAY') return el.getBoundingClientRect();
  const video = el.querySelector('video');
  return video ? containedBox(video) : el.getBoundingClientRect();
};

const contains = (box: Box, x: number, y: number, pad = 0) =>
  x >= box.left - pad && x <= box.left + box.width + pad && y >= box.top - pad && y <= box.top + box.height + pad;

/** Top-most layer under the point (text layers sit above the video). */
export const hitTest = (root: HTMLElement, x: number, y: number): BlitzLayer | null => {
  for (const layer of ['BUSINESS', 'TEXT'] as const) {
    const box = layerBox(root, layer);
    if (box && contains(box, x, y, TEXT_HIT_PADDING)) return layer;
  }
  const overlay = layerBox(root, 'OVERLAY');
  if (overlay && contains(overlay, x, y)) return 'OVERLAY';
  return null;
};

/** Box relative to `root`, for drawing the selection outline. */
export const relativeBox = (root: HTMLElement, box: Box): Box => {
  const r = root.getBoundingClientRect();
  return { left: box.left - r.left, top: box.top - r.top, width: box.width, height: box.height };
};
