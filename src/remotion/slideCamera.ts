/**
 * Camera moves for still photos in a Slideshow: a slow zoom/pan plus 2.5D depth parallax.
 * Pure math, shared by the composition (CameraStill.tsx), the web (blitzCamera.ts picks the moves) and the worker.
 */

import type { CameraMove, SlideCamera } from './types';

export const CAMERA_MOVES: readonly CameraMove[] = ['push_in', 'pull_out', 'drift_left', 'drift_right'];

/** Extra zoom over the shot: push_in ends at it, pull_out starts at it, drifts use half of it. */
const ZOOM: Record<SlideCamera['strength'], number> = { subtle: 1.08, medium: 1.15, strong: 1.22 };
/** Base overscan so displaced or panned edges never show. */
export const CAMERA_OVERSCAN = 1.06;
/** Displacement (px) of a near pixel at the frame edge at full parallax. */
const PARALLAX_PX = 150;
/** Drifts shear the whole frame (near rows slide against far ones), so they get less depth and always the low level. */
const DRIFT_PARALLAX_PX = 60;
const PARALLAX_LEVEL: Record<SlideCamera['parallax'], number> = { low: 0.35, medium: 0.6, high: 1 };
/** Depth spread at which parallax starts to shrink: wide near-to-far scenes (streets) warp the most. */
const SPREAD_REF = 0.6;
const DRIFT_PX = 35;
const PAN_PX = 30;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How strongly the depth map bends this photo, 0–1: the picked level × the depth-spread guard. */
export function depthAmount(camera: SlideCamera, spread: number): number {
  const level = camera.move.startsWith('drift') ? 'low' : camera.parallax;
  const spreadGuard = Math.min(1, SPREAD_REF / Math.max(spread, 0.01));
  return PARALLAX_LEVEL[level] * spreadGuard;
}

/**
 * The camera at progress p (0–1, eased) of the slide.
 * scale: zoom on top of CAMERA_OVERSCAN. k: feDisplacementMap scale. panX: px.
 */
export function cameraAt(camera: SlideCamera, p: number, amount: number): { scale: number; k: number; panX: number } {
  const z = ZOOM[camera.strength];
  const sweep = (px: number, toRight: boolean) => (toRight ? -px + 2 * px * p : px - 2 * px * p);
  const pan = camera.pan === 'none' ? 0 : sweep(PAN_PX, camera.pan === 'right');
  const drift = DRIFT_PARALLAX_PX * amount;
  switch (camera.move) {
    case 'push_in': return { scale: 1 + (z - 1) * p, k: -PARALLAX_PX * amount * p, panX: pan };
    case 'pull_out': return { scale: z - (z - 1) * p, k: -PARALLAX_PX * amount * (1 - p), panX: pan };
    case 'drift_left': return { scale: 1 + ((z - 1) / 2) * p, k: sweep(drift, false), panX: sweep(DRIFT_PX, false) };
    case 'drift_right': return { scale: 1 + ((z - 1) / 2) * p, k: sweep(drift, true), panX: sweep(DRIFT_PX, true) };
  }
}

/** CSS transform-origin for the zoom: the camera's focus point. */
export const cameraOrigin = (camera: SlideCamera) => `${clamp01(camera.focusX) * 100}% ${clamp01(camera.focusY) * 100}%`;

/** Used when the model gives nothing usable: moves cycle so two photos in a row never match. */
export function fallbackCamera(index: number): SlideCamera {
  return {
    move: CAMERA_MOVES[index % CAMERA_MOVES.length]!,
    focusX: 0.5, focusY: 0.45, strength: 'medium', parallax: 'low', pan: 'none',
  };
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Reads one model-returned camera; null when the move itself is missing or unknown. */
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
    parallax: pick(r.parallax, ['low', 'medium', 'high'] as const, 'low'),
    pan: move.startsWith('drift') ? 'none' : pick(r.pan, ['none', 'left', 'right'] as const, 'none'),
  };
}
