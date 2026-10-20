import { describe, expect, it } from 'vitest';
import { chooseTrack } from '../../../src/server/autoSlideshow/musicPick';

describe('chooseTrack', () => {
  it('picks at random among unused tracks', () => {
    const input = { pool: ['a', 'b', 'c'], recent: new Map<string, number>() };
    const picks = new Set([0, 0.5, 0.99].map((r) => chooseTrack({ ...input, used: new Set(), random: () => r })));
    expect(picks).toEqual(new Set(['a', 'b', 'c']));
  });

  it('skips tracks the workspace used more lately', () => {
    const pick = chooseTrack({ pool: ['a', 'b'], recent: new Map([['a', 1]]), used: new Set(), random: () => 0 });
    expect(pick).toBe('b');
  });

  it('never repeats in a batch until every track is used', () => {
    const used = new Set<string>();
    const input = { pool: ['a', 'b'], recent: new Map<string, number>(), used, random: () => 0 };
    expect([chooseTrack(input), chooseTrack(input), chooseTrack(input)]).toEqual(['a', 'b', 'a']);
  });

  it('returns null on an empty pool', () => {
    expect(chooseTrack({ pool: [], recent: new Map(), used: new Set() })).toBeNull();
  });
});
