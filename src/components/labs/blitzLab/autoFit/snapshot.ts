'use client';

/**
 * Builds the Auto Fit snapshot: the first frame of the green-screen composition, redrawn on a
 * 2D canvas with the same layout math as GreenScreenComposition + CaptionLayer, plus the boxes
 * the model reasons about. All coordinates are 1080×1920 canvas px.
 */

import { BLITZ_CANVAS_HEIGHT, BLITZ_CANVAS_WIDTH } from '../../../../config/blitzLab';
import { BUSINESS_DEFAULTS } from '../../../../remotion/businessDefaults';
import { resolveBlitzFont } from '../../../../remotion/fonts';
import type { TextConfig } from '../../../../remotion/types';
import { fitBox, keyedCanvas, loadFrame, opaqueBox, type Rect } from './frameCapture';

const W = BLITZ_CANVAS_WIDTH;
const H = BLITZ_CANVAS_HEIGHT;
/** Snapshot images are sent at half size: enough for layout, small upload. */
const OUT_SCALE = 0.5;
const LINE_HEIGHT = 1.25;

export type OverlayTransform = { zoom: number; offsetX: number; offsetY: number };

export type SnapshotInput = {
  backgroundUrl: string;
  backgroundIsImage: boolean;
  overlayUrl: string;
  overlay: OverlayTransform;
  captionText: string;
  textConfig: TextConfig;
  businessText?: string;
};

export type AutoFitLayout = {
  canvas: { width: number; height: number };
  /** Meme person box at zoom 1, no offset — the base the model's target is converted from. */
  subjectBase: Rect;
  /** Meme person box as it is now. */
  subjectNow: Rect;
  caption: Rect;
  business: Rect | null;
};

export type Snapshot = { backgroundJpeg: string; compositeJpeg: string; layout: AutoFitLayout };

/** Applies the composition's overlay transform (scale about the centre, then translate). */
export function transformRect(r: Rect, t: OverlayTransform): Rect {
  return {
    x: W / 2 + (r.x - W / 2) * t.zoom + t.offsetX,
    y: H / 2 + (r.y - H / 2) * t.zoom + t.offsetY,
    w: r.w * t.zoom,
    h: r.h * t.zoom,
  };
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

const fontOf = (c: TextConfig, size: number) => `${c.fontWeight ?? 700} ${size}px ${resolveBlitzFont(c.font)}`;

/** Draws the caption like CaptionLayer and returns its box. */
function drawCaption(ctx: CanvasRenderingContext2D, text: string, c: TextConfig): Rect {
  ctx.font = fontOf(c, c.fontSize);
  const pad = c.textBackground ? { x: c.fontSize * 0.55, y: c.fontSize * 0.18 } : { x: 0, y: 0 };
  const maxW = W - c.safeZonePadding * 2 - pad.x * 2;
  const lines = wrapLines(ctx, text, maxW);
  const lineH = c.fontSize * LINE_HEIGHT;
  const textW = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)));
  const box = { w: textW + pad.x * 2, h: lines.length * lineH + pad.y * 2 };
  const cx = W / 2 + (c.offsetX ?? 0);
  const rect = { x: cx - box.w / 2, y: c.positionY * H - box.h, w: box.w, h: box.h };
  if (c.textBackground) { ctx.fillStyle = c.textBackground; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  lines.forEach((l, i) => {
    const y = rect.y + pad.y + lineH * (i + 0.5);
    const stroke = c.strokeWidth ?? 3;
    if (stroke > 0) { ctx.lineWidth = stroke * 2; ctx.strokeStyle = c.strokeColor ?? '#000'; ctx.strokeText(l, cx, y); }
    ctx.fillStyle = c.color ?? '#fff';
    ctx.fillText(l, cx, y);
  });
  return rect;
}

/** Approximate business pill box (drawn as a dark pill so the model sees it). */
function drawBusiness(ctx: CanvasRenderingContext2D, text: string, c: TextConfig): Rect {
  const size = c.businessFontSize ?? BUSINESS_DEFAULTS.fontSize;
  ctx.font = fontOf(c, size);
  const w = ctx.measureText(text).width + size * 1.4;
  const h = size * 1.6;
  const cx = W / 2 + (c.businessOffsetX ?? BUSINESS_DEFAULTS.offsetX);
  const rect = { x: cx - w / 2, y: (c.businessPositionY ?? BUSINESS_DEFAULTS.positionY) * H - h, w, h };
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, rect.y + h / 2);
  return rect;
}

function newCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = W * OUT_SCALE;
  c.height = H * OUT_SCALE;
  const ctx = c.getContext('2d')!;
  ctx.scale(OUT_SCALE, OUT_SCALE);
  return [c, ctx];
}

const drawRect = (ctx: CanvasRenderingContext2D, src: CanvasImageSource, r: Rect) => ctx.drawImage(src, r.x, r.y, r.w, r.h);

export async function buildSnapshot(input: SnapshotInput): Promise<Snapshot> {
  const [bg, meme] = await Promise.all([
    loadFrame(input.backgroundUrl, input.backgroundIsImage),
    loadFrame(input.overlayUrl, false),
  ]);
  const [canvas, ctx] = newCanvas();
  drawRect(ctx, bg.source, fitBox(bg, W, H, 'cover'));
  const backgroundJpeg = canvas.toDataURL('image/jpeg', 0.8);

  const base = fitBox(meme, W, H, 'contain');
  // Key at half size (fast), then read the person box back in canvas px.
  const keyed = keyedCanvas(meme, base.w / 2, base.h / 2);
  const ob = opaqueBox(keyed);
  const subjectBase = ob
    ? { x: base.x + ob.x * 2, y: base.y + ob.y * 2, w: ob.w * 2, h: ob.h * 2 }
    : base;
  drawRect(ctx, keyed, transformRect(base, input.overlay));

  const caption = input.captionText.trim()
    ? drawCaption(ctx, input.captionText, input.textConfig)
    : { x: W / 2, y: input.textConfig.positionY * H, w: 0, h: 0 };
  const business = input.businessText?.trim() ? drawBusiness(ctx, input.businessText.trim(), input.textConfig) : null;

  return {
    backgroundJpeg,
    compositeJpeg: canvas.toDataURL('image/jpeg', 0.8),
    layout: {
      canvas: { width: W, height: H },
      subjectBase,
      subjectNow: transformRect(subjectBase, input.overlay),
      caption,
      business,
    },
  };
}
