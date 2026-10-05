import { describe, expect, it } from 'vitest';
import { chooseTrack, trackValue } from '../../../src/server/autoSlideshow/musicPick';

const fit = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe('chooseTrack', () => {
  it('picks the best fit when it stands alone', () => {
    const pick = chooseTrack({ pool: ['a', 'b', 'c'], fit: fit({ a: 0.9, b: 0.5, c: 0.4 }), recent: new Map(), used: new Set(), random: () => 0.99 });
    expect(pick).toBe('a');
  });

  it('rotates among tracks that fit about as well', () => {
    const input = { pool: ['a', 'b', 'c'], fit: fit({ a: 0.9, b: 0.85, c: 0.2 }), recent: new Map<string, number>() };
    const picks = new Set([0, 0.99].map((r) => chooseTrack({ ...input, used: new Set(), random: () => r })));
    expect(picks).toEqual(new Set(['a', 'b']));
  });

  it('lets a fresh track beat a slightly better one the workspace used lately', () => {
    const recent = new Map([['a', 3]]);
    expect(trackValue('a', fit({ a: 0.9 }), recent)).toBeCloseTo(0.45);
    const pick = chooseTrack({ pool: ['a', 'b'], fit: fit({ a: 0.9, b: 0.75 }), recent, used: new Set(), random: () => 0.99 });
    expect(pick).toBe('b');
  });

  it('never repeats in a batch until every track is used', () => {
    const used = new Set<string>();
    const input = { pool: ['a', 'b'], fit: fit({ a: 0.9, b: 0.1 }), recent: new Map<string, number>(), used };
    expect([chooseTrack(input), chooseTrack(input), chooseTrack(input)]).toEqual(['a', 'b', 'a']);
  });

  it('chooses by recency alone without Jev scores, and null on an empty pool', () => {
    const pick = chooseTrack({ pool: ['a', 'b'], fit: new Map(), recent: new Map([['a', 1]]), used: new Set(), random: () => 0.99 });
    expect(pick).toBe('b');
    expect(chooseTrack({ pool: [], fit: new Map(), recent: new Map(), used: new Set() })).toBeNull();
  });
});
