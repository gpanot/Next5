// A Prospect Pack's days: one post a day from tomorrow at 9:00 in the prospect's time zone, videos every other day, and
// a missing post's day taken by the next kind that has one. Only the free days' posts are made in full.

import { describe, expect, it } from 'vitest';
import { composeDays } from '../../../src/server/prospects/days';
import { fullCount, PROSPECT_FREE_DAYS, PROSPECT_ORDER } from '../../../src/types/admin/prospects';

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
const NOW = new Date('2026-10-18T15:00:00.000Z');

describe('composeDays', () => {
  it('follows the mix for a full pack', () => {
    const days = composeDays({ blitz: ids('b', 7), cast: ids('c', 3), hooks: ids('h', 4) }, NOW, 0);
    expect(days.map((d) => d.kind)).toEqual(PROSPECT_ORDER);
    expect(days.map((d) => d.day)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(days.filter((d) => d.kind === 'blitz').map((d) => d.refId)).toEqual(ids('b', 7));
  });

  it('starts tomorrow at 9:00 in the prospect time zone, one day apart', () => {
    // New York in October: UTC-4, getTimezoneOffset() = 240.
    const days = composeDays({ blitz: ids('b', 1), cast: ids('c', 1), hooks: [] }, NOW, 240);
    expect(days[0]!.at).toBe('2026-10-19T13:00:00.000Z');
    expect(days[1]!.at).toBe('2026-10-20T13:00:00.000Z');
  });

  it('fills a missing kind with the others and never makes empty days', () => {
    const days = composeDays({ blitz: ids('b', 2), cast: [], hooks: ids('h', 1) }, NOW, 0);
    expect(days.map((d) => d.refId)).toEqual(['b1', 'b2', 'h1']);
    expect(composeDays({ blitz: [], cast: [], hooks: [] }, NOW, 0)).toEqual([]);
  });

  it('marks previews, which land after the free days in a full pack', () => {
    const blitz = ids('b', 7);
    const cast = ids('c', 3);
    const previews = new Set([...blitz.slice(fullCount('blitz')), ...cast.slice(fullCount('cast'))]);
    const days = composeDays({ blitz, cast, hooks: ids('h', 4) }, NOW, 0, previews);
    expect(days.filter((d) => d.preview).every((d) => d.day > PROSPECT_FREE_DAYS)).toBe(true);
    expect(days.filter((d) => d.preview).map((d) => d.refId)).toEqual(['b5', 'c3', 'b6', 'b7']);
  });
});

describe('fullCount', () => {
  it('counts each kind in the free days', () => {
    expect([fullCount('blitz'), fullCount('cast'), fullCount('hooks')]).toEqual([4, 2, 1]);
  });
});
