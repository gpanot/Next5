/**
 * Camera moves for still photos in a Slideshow: a slow zoom/pan, no depth.
 * Pure math, shared by the composition (CameraStill.tsx), the Ideas deck cards (ShotLayers.tsx), the web
 * (blitzCamera.ts picks the moves) and the worker, so a card moves exactly like its render.
 */

import type { CameraMove, SlideCamera } from './types';

export const CAMERA_MOVES: readonly CameraMove[] = ['push_in', 'pull_out', 'drift_left', 'drift_right'];

/** Extra zoom over the shot: push_in ends at it, pull_out starts at it, drifts use half of it. */
const ZOOM: Record<SlideCamera['strength'], number> = { subtle: 1.08, medium: 1.15, strong: 1.22 };
/** Base overscan so panned edges never show. */
export const CAMERA_OVERSCAN = 1.06;
/** Sideways moves, in px of the 1080-wide frame. */
const FRAME_W = 1080;
const DRIFT_PX = 35;
const PAN_PX = 30;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** cubic-bezier(0.33, 0, 0.67, 1): the shot's ease (same curve as Remotion's Easing.bezier, no Remotion import). */
export function shotEase(t: number): number {
  const x = clamp01(t);
  if (x === 0 || x === 1) return x;
  const bez = (u: number, a: number, b: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  // Solve bez(u, 0.33, 0.67) = x by bisection (monotonic), then read y.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, 0.33, 0.67) < x) lo = mid; else hi = mid;
  }
  return bez((lo + hi) / 2, 0, 1);
}

/**
 * The camera at progress p (0–1, eased) of the slide.
 * scale: zoom on top of CAMERA_OVERSCAN. panX: px of the 1080-wide frame.
 */
export function cameraAt(camera: SlideCamera, p: number): { scale: number; panX: number } {
  const z = ZOOM[camera.strength];
  const sweep = (px: number, toRight: boolean) => (toRight ? -px + 2 * px * p : px - 2 * px * p);
  const pan = camera.pan === 'none' ? 0 : sweep(PAN_PX, camera.pan === 'right');
  switch (camera.move) {
    case 'push_in': return { scale: 1 + (z - 1) * p, panX: pan };
    case 'pull_out': return { scale: z - (z - 1) * p, panX: pan };
    case 'drift_left': return { scale: 1 + ((z - 1) / 2) * p, panX: sweep(DRIFT_PX, false) };
    case 'drift_right': return { scale: 1 + ((z - 1) / 2) * p, panX: sweep(DRIFT_PX, true) };
  }
}

/** CSS transform-origin for the zoom: the camera's focus point. */
export const cameraOrigin = (camera: SlideCamera) => `${clamp01(camera.focusX) * 100}% ${clamp01(camera.focusY) * 100}%`;

/**
 * CSS transform of a full-frame layer at raw progress t (0–1) of the slide. The pan is a % of the layer's width,
 * so a 390 px card and the 1080 px render move the same.
 */
export function cameraTransform(camera: SlideCamera, t: number): string {
  const { scale, panX } = cameraAt(camera, shotEase(t));
  return `translateX(${(panX / FRAME_W) * 100}%) scale(${CAMERA_OVERSCAN * scale})`;
}

/** Used when the model gives nothing usable: moves cycle so two photos in a row never match. */
export function fallbackCamera(index: number): SlideCamera {
  return { move: CAMERA_MOVES[index % CAMERA_MOVES.length]!, focusX: 0.5, focusY: 0.45, strength: 'medium', pan: 'none' };
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Reads one camera (model reply, saved card or render request); null when the move itself is missing or unknown. */
export function parseSlideCamera(raw: unknown): SlideCamera | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!CAMERA_MOVES.includes(r.move as CameraMove)) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : 0.5);
  const move = r.move as CameraMove;
  return {
    move,
    focusX: num(r.focusX),
    focusY: num(r.focusY),
    strength: pick(r.strength, ['subtle', 'medium', 'strong'] as const, 'medium'),
    pan: move.startsWith('drift') ? 'none' : pick(r.pan, ['none', 'left', 'right'] as const, 'none'),
  };
}
