import { describe, expect, it } from 'vitest';
import { keepTimeOn, placeIdea } from '../../src/components/admin/autoSlideshow/calendar/ideaPlacement';
import { dayKey, type PlanDay } from '../../src/components/admin/autoSlideshow/calendar/monthPlan';

const NOW = new Date(2026, 9, 4, 11); // Sun Oct 4, 11 AM local

const day = (date: number): PlanDay => {
  const d = new Date(2026, 9, date);
  return { key: dayKey(d), date: d, past: date < 4, today: date === 4, inMonth: true, slots: [] };
};

const days = Array.from({ length: 28 }, (_, i) => day(i + 1));

/** Posts and kept ideas on each day: by day of month. */
const takenFrom = (taken: Record<number, number>) => (d: PlanDay) => taken[d.date.getDate()] ?? 0;

describe('placeIdea', () => {
  it('fills the soonest empty day, from tomorrow', () => {
    expect(placeIdea('i', days, takenFrom({}), NOW)).toBe(keepTimeOn(day(5), 0));
  });

  it('skips days that already have a slideshow, a video or a kept idea', () => {
    expect(placeIdea('i', days, takenFrom({ 5: 1, 6: 1, 7: 2 }), NOW)).toBe(keepTimeOn(day(8), 0));
  });

  it('adds a second post only once every day of the ideas window has one', () => {
    const taken = Object.fromEntries(days.map((d) => [d.date.getDate(), 1]));
    expect(placeIdea('i', days, takenFrom({ ...taken, 5: 2 }), NOW)).toBe(keepTimeOn(day(6), 1));
  });

  it('never uses today or a past day, and gives up when every day is full', () => {
    const full = Object.fromEntries(days.map((d) => [d.date.getDate(), 5]));
    expect(placeIdea('i', days, takenFrom(full), NOW)).toBeUndefined();
  });
});
