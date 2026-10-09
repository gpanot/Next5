import { describe, expect, it } from 'vitest';
import { atViewerTime, planIdeaTimes, viewerDay } from '../../../src/server/labs/ideaDays';
import { IDEA_DAYS, IDEAS_PER_DAY } from '../../../src/types/admin/calendarIdeas';

// New York in October: UTC-4, getTimezoneOffset() = 240.
const NY = 240;
const NOW = new Date('2026-10-04T15:00:00Z'); // Sun Oct 4, 11:00 AM in New York
const TODAY = viewerDay(NOW, NY);

const countByDay = (times: Date[]) => {
  const map = new Map<number, number>();
  for (const t of times) map.set(viewerDay(t, NY), (map.get(viewerDay(t, NY)) ?? 0) + 1);
  return map;
};

describe('planIdeaTimes', () => {
  it('starts tomorrow and stays within the ideas window', () => {
    const times = planIdeaTimes(12, new Map(), NOW, NY);
    expect(times).toHaveLength(12);
    const days = times.map((t) => viewerDay(t, NY));
    expect(Math.min(...days)).toBe(TODAY + 1);
    expect(Math.max(...days)).toBeLessThanOrEqual(TODAY + IDEA_DAYS);
  });

  it('gives every day one idea before any day gets a second', () => {
    const counts = countByDay(planIdeaTimes(12, new Map(), NOW, NY));
    expect([...counts.values()].every((n) => n === 1)).toBe(true);
    const more = countByDay(planIdeaTimes(20, new Map(), NOW, NY));
    expect(Math.max(...more.values())).toBe(2);
    expect(more.size).toBe(IDEA_DAYS);
  });

  it('fills empty days before adding to days that already have posts or ideas', () => {
    const busy = new Map([[TODAY + 1, 4], [TODAY + 2, 1], [TODAY + 3, 2]]);
    const counts = countByDay(planIdeaTimes(IDEA_DAYS - 3, busy, NOW, NY));
    expect([TODAY + 1, TODAY + 2, TODAY + 3].some((d) => counts.has(d))).toBe(false);
    expect(counts.size).toBe(IDEA_DAYS - 3);
    const next = countByDay(planIdeaTimes(IDEA_DAYS - 2, busy, NOW, NY));
    expect(next.get(TODAY + 2)).toBe(1); // every empty day has one: then the day with 1 post
    expect(next.has(TODAY + 1)).toBe(false);
  });

  it('skips full days and never passes the per-day idea cap', () => {
    const busy = new Map([[TODAY + 1, 5], [TODAY + 2, 4]]);
    const times = planIdeaTimes(60, busy, NOW, NY);
    const counts = countByDay(times);
    expect(counts.get(TODAY + 1)).toBeUndefined();
    expect(counts.get(TODAY + 2)).toBe(1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(IDEAS_PER_DAY);
    expect(times.length).toBe(1 + (IDEA_DAYS - 2) * IDEAS_PER_DAY);
  });

  it('puts ideas at the post times of the viewer day, after what is there', () => {
    const [first] = planIdeaTimes(1, new Map(), NOW, NY);
    expect(first!.toISOString()).toBe(atViewerTime(TODAY + 1, '19:00', NY).toISOString());
    expect(first!.toISOString()).toBe('2026-10-05T23:00:00.000Z'); // 7 PM in New York
    const everyDayOne = new Map(Array.from({ length: IDEA_DAYS }, (_, i) => [TODAY + 1 + i, 1]));
    const [after] = planIdeaTimes(1, everyDayOne, NOW, NY);
    expect(after!.toISOString()).toBe(atViewerTime(TODAY + 1, '19:00', NY).toISOString()); // 2 posts: 12:00, 19:00
  });
});
