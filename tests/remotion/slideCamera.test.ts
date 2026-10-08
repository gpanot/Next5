import { describe, expect, it } from 'vitest';
import { cameraAt, depthAmount, fallbackCamera, parseSlideCamera } from '../../src/remotion/slideCamera';
import type { SlideCamera } from '../../src/remotion/types';

const base: SlideCamera = { move: 'push_in', focusX: 0.5, focusY: 0.5, strength: 'medium', parallax: 'medium', pan: 'none' };

describe('parseSlideCamera', () => {
  it('rejects an unknown move', () => {
    expect(parseSlideCamera({ move: 'spin' })).toBeNull();
  });

  it('fills defaults and clamps the focus', () => {
    expect(parseSlideCamera({ move: 'pull_out', focusX: 1.4, strength: 'huge' })).toEqual({
      move: 'pull_out', focusX: 1, focusY: 0.5, strength: 'medium', parallax: 'low', pan: 'none',
    });
  });

  it('drops the pan on drifts', () => {
    expect(parseSlideCamera({ move: 'drift_left', pan: 'right' })?.pan).toBe('none');
  });
});

describe('depthAmount', () => {
  it('caps drifts at the low level', () => {
    expect(depthAmount({ ...base, move: 'drift_left', parallax: 'high' }, 0.6)).toBeCloseTo(0.35);
  });

  it('lowers parallax for a wide depth spread', () => {
    expect(depthAmount({ ...base, parallax: 'high' }, 1.2)).toBeCloseTo(0.5);
  });
});

describe('cameraAt', () => {
  it('push_in zooms from 1 to the strength and bends more over time', () => {
    expect(cameraAt(base, 0, 1)).toEqual({ scale: 1, k: -0, panX: 0 });
    const end = cameraAt(base, 1, 1);
    expect(end.scale).toBeCloseTo(1.15);
    expect(end.k).toBe(-150);
  });

  it('pans toward the chosen side', () => {
    const right = { ...base, pan: 'right' as const };
    expect(cameraAt(right, 0, 1).panX).toBe(-30);
    expect(cameraAt(right, 1, 1).panX).toBe(30);
  });
});

describe('fallbackCamera', () => {
  it('never repeats a move on neighbouring photos', () => {
    const moves = [0, 1, 2, 3, 4].map((i) => fallbackCamera(i).move);
    moves.slice(1).forEach((m, i) => expect(m).not.toBe(moves[i]));
  });
});
