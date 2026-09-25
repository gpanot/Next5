'use client';

/**
 * First-frame grabs for Auto Fit.
 *
 * The Remotion player draws the meme through a WebGL colour key, which cannot be read back
 * reliably. Instead we load each layer's source (same-origin proxy URLs, so the canvas is
 * never tainted), take its first frame, and key the green ourselves. The result matches
 * what the composition shows at frame 0.
 */

export type Frame = { source: CanvasImageSource; width: number; height: number };
export type Rect = { x: number; y: number; w: number; h: number };

const FRAME_TIMEOUT_MS = 15_000;
/** Seek a hair past 0: some encoders give a black frame at exactly 0. */
const FIRST_FRAME_S = 0.05;

function withTimeout<T>(p: Promise<T>, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out loading ${what}`)), FRAME_TIMEOUT_MS);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e: unknown) => { clearTimeout(timer); reject(e); });
  });
}

function loadImage(url: string): Promise<Frame> {
  return withTimeout(new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Background image failed to load'));
    img.src = url;
  }), 'image');
}

function loadVideoFrame(url: string): Promise<Frame> {
  return withTimeout(new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onloadeddata = () => { video.currentTime = Math.min(FIRST_FRAME_S, video.duration || FIRST_FRAME_S); };
    video.onseeked = () => resolve({ source: video, width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => reject(new Error('Video failed to load'));
    video.src = url;
  }), 'video');
}

export const loadFrame = (url: string, isImage: boolean): Promise<Frame> =>
  (isImage ? loadImage(url) : loadVideoFrame(url));

/** Box of a frame drawn with object-fit: contain (or cover) inside W×H. */
export function fitBox(frame: Frame, W: number, H: number, mode: 'contain' | 'cover'): Rect {
  const scale = mode === 'contain'
    ? Math.min(W / frame.width, H / frame.height)
    : Math.max(W / frame.width, H / frame.height);
  const w = frame.width * scale;
  const h = frame.height * scale;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

/**
 * Keys out #00ff00 like the composition's colorKey (similarity 0.35, spill suppression).
 * Returns a canvas of the frame at `w × h` with transparent green.
 */
export function keyedCanvas(frame: Frame, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(frame.source, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!;
    const excess = g - Math.max(r, b);
    if (excess > 60) d[i + 3] = 0;
    else if (excess > 25) { d[i + 3] = Math.round(255 * (1 - (excess - 25) / 35)); d[i + 1] = Math.max(r, b); }
    else if (excess > 0) d[i + 1] = Math.max(r, b);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Bounding box of the non-transparent pixels (the person in the meme), in canvas px. */
export function opaqueBox(keyed: HTMLCanvasElement): Rect | null {
  const ctx = keyed.getContext('2d', { willReadFrequently: true })!;
  const { width: W, height: H } = keyed;
  const d = ctx.getImageData(0, 0, W, H).data;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (d[(y * W + x) * 4 + 3]! < 128) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
