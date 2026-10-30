import { describe, expect, it } from 'vitest';
import { correctCutout } from '../../../src/server/copyViral/measure';

describe('correctCutout', () => {
  it('solves scale, x and bottom so my face lands on the original face, at its size', () => {
    const now = { scale: 0.8, x: 540, bottom: 1920 };
    const cam = { eyesX: 540, height: 1920 };
    // my face drawn at (540, 1240), 360 px tall; the original's at (500, 880), 300 px tall
    const fix = correctCutout(now, cam, { cx: 540, cy: 1240, h: 360 }, { cx: 500, cy: 880, h: 300 });
    expect(fix.scale).toBeCloseTo(0.667, 3);
    // applying it moves my face centre exactly onto the target: x0 + fx * s, y0 + fy * s
    const fx = (540 - (540 - 540 * 0.8)) / 0.8;
    const fy = (1240 - (1920 - 1920 * 0.8)) / 0.8;
    expect(Math.round(fix.x - 540 * fix.scale + fx * fix.scale)).toBe(500);
    expect(Math.round(fix.bottom - 1920 * fix.scale + fy * fix.scale)).toBe(880);
  });
});
