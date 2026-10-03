import { describe, expect, it } from 'vitest';
import { autoSlot, dayKey, isBookable, monthDays } from '../../src/components/labs/blitzLab/schedule/slots';

describe('Blitz schedule slots', () => {
  const now = new Date(2026, 9, 3, 15, 0);

  it('auto schedules on the first free day from tomorrow, at 7 PM', () => {
    const taken = [new Date(2026, 9, 4, 19, 0), new Date(2026, 9, 5, 9, 0)];
    const at = autoSlot(taken, now);
    expect(dayKey(at)).toBe('2026-10-06');
    expect(at.getHours()).toBe(19);
  });

  it('never picks today', () => {
    expect(dayKey(autoSlot([], now))).toBe('2026-10-04');
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
