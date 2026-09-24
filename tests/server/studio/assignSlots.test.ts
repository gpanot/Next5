/**
 * Unit tests for the mocked calendar slot assignment helper.
 * Pure function — no mocks needed.
 */
import { describe, expect, it } from 'vitest';
import { slotDates } from '../../../src/server/studio/assignSlots';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

describe('slotDates', () => {
  it('always starts from tomorrow, never today', () => {
    const today = new Date();
    const todayDay = today.getDay();
    // Include today's weekday in the cadence to make sure it's skipped
    const todayName = DAY_NAMES[todayDay]!;
    const dates = slotDates({ weekdays: [todayName] }, 1);
    if (dates.length > 0) {
      // First date must be at least tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      expect(dates[0].getTime()).toBeGreaterThanOrEqual(tomorrow.getTime());
    }
  });

  it('returns exactly the requested count when cadence is simple', () => {
    const dates = slotDates({ weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'] }, 6);
    expect(dates).toHaveLength(6);
  });

  it('respects weekday constraints — only returns Mon/Wed/Fri slots', () => {
    const dates = slotDates({ weekdays: ['mon', 'wed', 'fri'] }, 6);
    expect(dates).toHaveLength(6);
    for (const d of dates) {
      const day = d.getDay();
      expect([1, 3, 5]).toContain(day); // mon=1, wed=3, fri=5
    }
  });

  it('uses Mon/Wed/Fri default when no weekdays provided', () => {
    const dates = slotDates({}, 3);
    expect(dates).toHaveLength(3);
    for (const d of dates) {
      expect([1, 3, 5]).toContain(d.getDay());
    }
  });

  it('uses Mon/Wed/Fri fallback when weekdays is empty array', () => {
    const dates = slotDates({ weekdays: [] }, 2);
    expect(dates).toHaveLength(2);
    for (const d of dates) {
      expect([1, 3, 5]).toContain(d.getDay());
    }
  });

  it('fills two weeks at 3/week correctly (6 slots)', () => {
    const dates = slotDates({ weekdays: ['mon', 'wed', 'fri'] }, 6);
    expect(dates).toHaveLength(6);

    // No date should repeat
    const isos = dates.map((d) => d.toISOString().slice(0, 10));
    const unique = new Set(isos);
    expect(unique.size).toBe(6);

    // Dates should be strictly ascending
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1]!.getTime());
    }
  });

  it('sets time to 9am', () => {
    const dates = slotDates({ weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'] }, 3);
    for (const d of dates) {
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
    }
  });

  it('handles a weekend-only cadence', () => {
    const dates = slotDates({ weekdays: ['sat', 'sun'] }, 4);
    expect(dates).toHaveLength(4);
    for (const d of dates) {
      expect([0, 6]).toContain(d.getDay()); // sun=0, sat=6
    }
  });

  it('returns empty array when count is 0', () => {
    const dates = slotDates({ weekdays: ['mon', 'wed', 'fri'] }, 0);
    expect(dates).toHaveLength(0);
  });

  it('is deterministic for the same input (same weekday constraints)', () => {
    const a = slotDates({ weekdays: ['mon', 'wed', 'fri'] }, 6);
    const b = slotDates({ weekdays: ['mon', 'wed', 'fri'] }, 6);
    expect(a.map((d) => d.getDay())).toEqual(b.map((d) => d.getDay()));
  });
});
