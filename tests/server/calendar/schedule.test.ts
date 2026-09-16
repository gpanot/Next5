import { describe, expect, it } from 'vitest';
import {
  isoDate,
  nextSlotDates,
  orderForCalendar,
  placeItems,
  slotDatesUntil,
  slotOfDayFor,
  type PlaceableItem,
} from '../../../src/server/calendar/schedule';
import { at } from '../../helpers/db';

/** Tue/Thu/Sat — the default cadence: 12 posts a month, the promise threshold. */
const TTS = [2, 4, 6];

const item = (id: string, over: Partial<PlaceableItem> = {}): PlaceableItem => ({
  id,
  score: 80,
  bestFor: 'feed',
  sceneId: null,
  createdAt: at('2026-09-01T00:00:00Z'),
  ...over,
});

describe('nextSlotDates', () => {
  it('starts today when today is a posting day', () => {
    // 2026-09-15 is a Tuesday.
    expect(nextSlotDates(at('2026-09-15T09:00:00Z'), TTS, 4)).toEqual(['2026-09-15', '2026-09-17', '2026-09-19', '2026-09-22']);
  });

  it('skips dates that already hold a slot', () => {
    const taken = new Set(['2026-09-15', '2026-09-19']);
    expect(nextSlotDates(at('2026-09-15T09:00:00Z'), TTS, 3, taken)).toEqual(['2026-09-17', '2026-09-22', '2026-09-24']);
  });

  it('crosses month and year boundaries', () => {
    // The 29th is itself a Tuesday, so it counts.
    expect(nextSlotDates(at('2026-09-29T00:00:00Z'), TTS, 3)).toEqual(['2026-09-29', '2026-10-01', '2026-10-03']);
    expect(nextSlotDates(at('2026-12-29T00:00:00Z'), TTS, 3)).toEqual(['2026-12-29', '2026-12-31', '2027-01-02']);
  });

  it('returns nothing for an empty, invalid or zero-count request', () => {
    expect(nextSlotDates(at('2026-09-15T00:00:00Z'), [], 3)).toEqual([]);
    expect(nextSlotDates(at('2026-09-15T00:00:00Z'), [9], 3)).toEqual([]);
    expect(nextSlotDates(at('2026-09-15T00:00:00Z'), TTS, 0)).toEqual([]);
  });

  it('handles every day of the week without looping forever', () => {
    expect(nextSlotDates(at('2026-09-15T00:00:00Z'), [0, 1, 2, 3, 4, 5, 6], 3)).toEqual(['2026-09-15', '2026-09-16', '2026-09-17']);
    // Capped by the lookahead rather than running away.
    expect(nextSlotDates(at('2026-09-15T00:00:00Z'), TTS, 500).length).toBeLessThan(200);
  });
});

describe('slotDatesUntil', () => {
  it('covers the buffer window and excludes the end date itself', () => {
    // Tue 15th through the fortnight ending Tue 29th.
    expect(slotDatesUntil(at('2026-09-15T00:00:00Z'), at('2026-09-29T00:00:00Z'), TTS)).toEqual([
      '2026-09-15', '2026-09-17', '2026-09-19', '2026-09-22', '2026-09-24', '2026-09-26',
    ]);
  });

  it('is empty when the window has already closed', () => {
    expect(slotDatesUntil(at('2026-09-29T00:00:00Z'), at('2026-09-15T00:00:00Z'), TTS)).toEqual([]);
  });
});

describe('orderForCalendar', () => {
  it('sends her best photo out first', () => {
    const ordered = orderForCalendar([item('a', { score: 60 }), item('b', { score: 91 }), item('c', { score: 74 })]);
    expect(ordered.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('never schedules a profile photo', () => {
    const ordered = orderForCalendar([item('face', { bestFor: 'profile', score: 99 }), item('post', { score: 50 })]);
    expect(ordered.map((i) => i.id)).toEqual(['post']);
  });

  it('never puts two photos from the same scene back to back', () => {
    const ordered = orderForCalendar([
      item('a1', { sceneId: 'desk', score: 95 }),
      item('a2', { sceneId: 'desk', score: 94 }),
      item('a3', { sceneId: 'desk', score: 93 }),
      item('b1', { sceneId: 'door', score: 70 }),
      item('b2', { sceneId: 'door', score: 60 }),
    ]);
    const scenes = ordered.map((i) => i.sceneId);
    expect(scenes).toEqual(['desk', 'door', 'desk', 'door', 'desk']);
    expect(ordered).toHaveLength(5);
  });

  it('falls back to the best remaining photo when every one left repeats the scene', () => {
    const ordered = orderForCalendar([
      item('a1', { sceneId: 'desk', score: 95 }),
      item('a2', { sceneId: 'desk', score: 80 }),
      item('a3', { sceneId: 'desk', score: 70 }),
    ]);
    expect(ordered.map((i) => i.id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('breaks ties on newest first, then id, so the order is stable', () => {
    const ordered = orderForCalendar([
      item('old', { score: 80, createdAt: at('2026-09-01T00:00:00Z') }),
      item('new', { score: 80, createdAt: at('2026-09-05T00:00:00Z') }),
    ]);
    expect(ordered.map((i) => i.id)).toEqual(['new', 'old']);
    expect(orderForCalendar([item('b'), item('a')]).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('keeps unscored photos, ranked below scored ones', () => {
    const ordered = orderForCalendar([item('unscored', { score: null }), item('scored', { score: 10 })]);
    expect(ordered.map((i) => i.id)).toEqual(['scored', 'unscored']);
  });
});

describe('placeItems', () => {
  it('pairs the best photos with the next open dates', () => {
    const dates = nextSlotDates(at('2026-09-15T09:00:00Z'), TTS, 3);
    const placements = placeItems([item('a', { score: 60 }), item('b', { score: 91 }), item('c', { score: 74 })], dates);
    expect(placements).toEqual([
      { itemId: 'b', scheduledFor: '2026-09-15', slotOfDay: 'evening' },
      { itemId: 'c', scheduledFor: '2026-09-17', slotOfDay: 'evening' },
      { itemId: 'a', scheduledFor: '2026-09-19', slotOfDay: 'evening' },
    ]);
  });

  it('stops at whichever runs out first, photos or dates', () => {
    expect(placeItems([item('a'), item('b')], ['2026-09-15'])).toHaveLength(1);
    expect(placeItems([item('a')], ['2026-09-15', '2026-09-17'])).toHaveLength(1);
    expect(placeItems([], ['2026-09-15'])).toEqual([]);
  });

  it('puts a story photo in the morning and a feed photo in the evening', () => {
    expect(slotOfDayFor(item('s', { bestFor: 'story' }))).toBe('morning');
    expect(slotOfDayFor(item('f', { bestFor: 'feed' }))).toBe('evening');
    expect(slotOfDayFor(item('n', { bestFor: null }))).toBe('evening');
  });
});

describe('isoDate', () => {
  it('reads the day in UTC', () => {
    expect(isoDate(at('2026-09-15T23:59:00Z'))).toBe('2026-09-15');
  });
});
