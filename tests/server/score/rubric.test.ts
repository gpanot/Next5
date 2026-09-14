import { describe, expect, it } from 'vitest';
import { SCORE_CRITERIA, scoreBand, totalScore } from '../../../src/lib/scoreRubric';

describe('Scroll-Stop Score rubric', () => {
  it('weights add up to 1', () => {
    expect(SCORE_CRITERIA.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1);
  });

  it('turns 0–10 checks into a 0–100 score and clamps bad input', () => {
    const all = (n: number) => ({ stop: n, subject: n, thumbnail: n, light: n, fresh: n, real: n });
    expect(totalScore(all(10))).toBe(100);
    expect(totalScore(all(7))).toBe(70);
    expect(totalScore({ ...all(10), stop: 99, real: -4 })).toBe(85);
    expect(scoreBand(84)).toBe('great');
    expect(scoreBand(70)).toBe('good');
    expect(scoreBand(40)).toBe('fair');
  });
});
