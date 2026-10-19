import { describe, expect, it } from 'vitest';
import { cameraAt, cameraTransform, fallbackCamera, parseSlideCamera, shotEase } from '../../src/remotion/slideCamera';
import type { SlideCamera } from '../../src/remotion/types';

const base: SlideCamera = { move: 'push_in', focusX: 0.5, focusY: 0.5, strength: 'medium', pan: 'none' };

describe('parseSlideCamera', () => {
  it('rejects an unknown move', () => {
    expect(parseSlideCamera({ move: 'spin' })).toBeNull();
  });

  it('fills defaults, clamps the focus and drops old depth fields', () => {
    expect(parseSlideCamera({ move: 'pull_out', focusX: 1.4, strength: 'huge', parallax: 'high' })).toEqual({
      move: 'pull_out', focusX: 1, focusY: 0.5, strength: 'medium', pan: 'none',
    });
  });

  it('drops the pan on drifts', () => {
    expect(parseSlideCamera({ move: 'drift_left', pan: 'right' })?.pan).toBe('none');
  });
});

describe('cameraAt', () => {
  it('push_in zooms from 1 to the strength', () => {
    expect(cameraAt(base, 0)).toEqual({ scale: 1, panX: 0 });
    expect(cameraAt(base, 1).scale).toBeCloseTo(1.15);
  });

  it('pans toward the chosen side', () => {
    const right = { ...base, pan: 'right' as const };
    expect(cameraAt(right, 0).panX).toBe(-30);
    expect(cameraAt(right, 1).panX).toBe(30);
  });
});

describe('shotEase', () => {
  it('starts at 0, ends at 1, is symmetric', () => {
    expect(shotEase(0)).toBeCloseTo(0);
    expect(shotEase(1)).toBeCloseTo(1);
    expect(shotEase(0.5)).toBeCloseTo(0.5);
    expect(shotEase(0.25) + shotEase(0.75)).toBeCloseTo(1);
  });
});

describe('cameraTransform', () => {
  it('gives the pan as a share of the frame width', () => {
    expect(cameraTransform({ ...base, move: 'drift_right' }, 0)).toBe(`translateX(${(-35 / 1080) * 100}%) scale(1.06)`);
  });
});

describe('fallbackCamera', () => {
  it('never repeats a move on neighbouring photos', () => {
    const moves = [0, 1, 2, 3, 4].map((i) => fallbackCamera(i).move);
    moves.slice(1).forEach((m, i) => expect(m).not.toBe(moves[i]));
  });
});
