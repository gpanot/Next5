import { describe, expect, it } from 'vitest';
import { autoSlot, bestDays, dayKey, isBookable, MAX_POSTS_PER_DAY, monthDays } from '../../src/components/labs/addToCalendar/slots';

describe('Add to calendar slots', () => {
  const now = new Date(2026, 9, 3, 15, 0);

  it('auto schedules on the first free day from tomorrow, at 7 PM', () => {
    const counts = new Map([['2026-10-04', 1], ['2026-10-05', 2]]);
    const at = autoSlot(counts, now);
    expect(dayKey(at)).toBe('2026-10-06');
    expect(at.getHours()).toBe(19);
  });

  it('never picks today', () => {
    expect(dayKey(autoSlot(new Map(), now))).toBe('2026-10-04');
  });

  it('suggests 3 empty days, never two in a row', () => {
    const counts = new Map([['2026-10-06', 1]]);
    expect(bestDays(counts, now).map(dayKey)).toEqual(['2026-10-04', '2026-10-07', '2026-10-09']);
  });

  it('skips full days when no day is empty', () => {
    const counts = new Map<string, number>();
    for (let d = 4; d <= 31; d += 1) counts.set(`2026-10-${String(d).padStart(2, '0')}`, d === 4 ? MAX_POSTS_PER_DAY : 1);
    for (let d = 1; d <= 20; d += 1) counts.set(`2026-11-${String(d).padStart(2, '0')}`, 1);
    expect(dayKey(autoSlot(counts, now))).toBe('2026-10-05');
  });

  it('builds whole Monday-first weeks', () => {
    const days = monthDays(new Date(2026, 9, 1));
    expect(days.length % 7).toBe(0);
    expect(days[0]!.getDay()).toBe(1);
    expect(days.at(-1)!.getDay()).toBe(0);
  });

  it('refuses times too close to now', () => {
    expect(isBookable(new Date(2026, 9, 3, 15, 10), now)).toBe(false);
    expect(isBookable(new Date(2026, 9, 3, 19, 0), now)).toBe(true);
  });
});
