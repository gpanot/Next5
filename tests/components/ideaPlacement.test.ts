import { describe, expect, it } from 'vitest';
import { keepTimeOn, placeIdea } from '../../src/components/admin/autoSlideshow/calendar/ideaPlacement';
import { dayKey, type PlanDay } from '../../src/components/admin/autoSlideshow/calendar/monthPlan';

const NOW = new Date(2026, 9, 4, 11); // Sun Oct 4, 11 AM local

const day = (date: number): PlanDay => {
  const d = new Date(2026, 9, date);
  return { key: dayKey(d), date: d, past: date < 4, today: date === 4, inMonth: true, slots: [] };
};

const days = Array.from({ length: 28 }, (_, i) => day(i + 1));

/** Posts and kept ideas on each day: by day of month, at 8 AM, 9 AM, … (times no keep would pick). */
const takenFrom = (taken: Record<number, number>) => (d: PlanDay) =>
  Array.from({ length: taken[d.date.getDate()] ?? 0 }, (_, i) => new Date(2026, 9, d.date.getDate(), 6 + i));

describe('placeIdea', () => {
  it('fills the soonest empty day, from tomorrow', () => {
    expect(placeIdea('i', days, takenFrom({}), NOW)).toBe(keepTimeOn(day(5), []));
  });

  it('skips days that already have a slideshow, a video or a kept idea', () => {
    expect(placeIdea('i', days, takenFrom({ 5: 1, 6: 1, 7: 2 }), NOW)).toBe(keepTimeOn(day(8), []));
  });

  it('never stacks onto a day with a post: the next empty day, however far', () => {
    const taken = Object.fromEntries(days.filter((d) => d.date.getDate() !== 21).map((d) => [d.date.getDate(), 1]));
    expect(placeIdea('i', days, takenFrom(taken), NOW)).toBe(keepTimeOn(day(21), []));
  });

  it('walks past the days built when every one of them has a post', () => {
    const full = Object.fromEntries(days.map((d) => [d.date.getDate(), 2]));
    const after = new Date(2026, 9, 29);
    expect(placeIdea('i', days, takenFrom(full), NOW)).toBe(keepTimeOn({ ...day(28), key: dayKey(after), date: after }, []));
  });

  it('never uses today or a past day', () => {
    const full = Object.fromEntries(days.filter((d) => d.date.getDate() >= 5).map((d) => [d.date.getDate(), 1]));
    expect(new Date(placeIdea('i', days, takenFrom(full), NOW)!).getDate()).toBe(29);
  });
});

describe('keepTimeOn', () => {
  const at = (iso: string | undefined) => (iso ? new Date(iso).toTimeString().slice(0, 5) : undefined);
  const on = (...hours: number[]) => hours.map((h) => new Date(2026, 9, 6, h));

  it('gives each keep on a day its own time, 7 PM first', () => {
    expect(at(keepTimeOn(day(6), []))).toBe('19:00');
    expect(at(keepTimeOn(day(6), on(19)))).toBe('21:00');
    expect(at(keepTimeOn(day(6), on(19, 21)))).toBe('17:00');
    expect(at(keepTimeOn(day(6), on(21)))).toBe('19:00');
  });

  it('stops at 5 posts on a day', () => {
    expect(keepTimeOn(day(6), on(8, 11, 14, 17, 20))).toBeUndefined();
  });
});
