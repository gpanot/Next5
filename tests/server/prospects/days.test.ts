// A Prospect Pack's days: one post a day from tomorrow at 9:00 in the prospect's time zone, videos every other day, and
// a missing post's day taken by the next kind that has one. Only the free days' posts are made in full.

import { describe, expect, it } from 'vitest';
import { composeDays, daysFromPlan, rebaseDays } from '../../../src/server/prospects/days';
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

describe('days from the calendar', () => {
  it('numbers the posts in time order', () => {
    const days = daysFromPlan([{ at: '2026-11-05T02:00:00.000Z', kind: 'hooks', refId: 'h' }, { at: '2026-11-03T02:00:00.000Z', kind: 'blitz', refId: 'b', preview: true }]);
    expect(days.map((d) => [d.day, d.refId, d.preview])).toEqual([[1, 'b', true], [2, 'h', undefined]]);
  });

  it('moves days from tomorrow on when the first one has passed, keeps them otherwise', () => {
    const now = new Date('2026-11-02T10:00:00.000Z');
    const past = [{ day: 1, at: '2026-10-22T09:00:00.000Z', kind: 'blitz' as const, refId: 'a' }, { day: 2, at: '2026-10-23T09:00:00.000Z', kind: 'cast' as const, refId: 'b' }];
    expect(rebaseDays(past, now, 0).map((d) => [d.refId, d.at.slice(0, 10)])).toEqual([['a', '2026-11-03'], ['b', '2026-11-04']]);
    const ahead = [{ ...past[0]!, at: '2026-11-06T09:00:00.000Z' }];
    expect(rebaseDays(ahead, now, 0)).toEqual(ahead);
  });
});
