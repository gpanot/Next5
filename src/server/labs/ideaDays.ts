// Pure date math for calendar ideas: which days and times a batch of ideas goes on. No database here, so it is tested
// on its own (tests/server/calendar/ideaDays.test.ts).

import { MAX_PER_DAY, POST_TIMES } from '../../lib/postTimes';
import { IDEA_DAYS, IDEAS_PER_DAY } from '../../types/admin/calendarIdeas';

const DAY_MS = 86_400_000;

/** A valid `getTimezoneOffset()` in ms (0 when missing or absurd). */
export const offsetMs = (tzOffsetMin: unknown): number =>
  (typeof tzOffsetMin === 'number' && Math.abs(tzOffsetMin) <= 14 * 60 ? tzOffsetMin : 0) * 60_000;

/** The viewer's day number (days since 1970 in their time zone). */
export const viewerDay = (at: Date, tzOffsetMin: unknown): number => Math.floor((at.getTime() - offsetMs(tzOffsetMin)) / DAY_MS);

/** `hh:mm` on viewer day `day`, as an instant. */
export const atViewerTime = (day: number, hhmm: string, tzOffsetMin: unknown): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day * DAY_MS + ((h ?? 19) * 60 + (m ?? 0)) * 60_000 + offsetMs(tzOffsetMin));
};

/**
 * Times for `count` ideas over the next IDEA_DAYS days, from tomorrow (the viewer's days). `busy` holds the posts and
 * ideas already on each day (by viewer day number). Ideas spread evenly: every day with room gets one before any day
 * gets a second, and a day never goes past IDEAS_PER_DAY new ideas or MAX_PER_DAY posts. Fewer times come back when
 * the days are full. Each day's ideas take the day's later post times, so they sit after what is there.
 */
export const planIdeaTimes = (count: number, busy: Map<number, number>, now: Date, tzOffsetMin: unknown): Date[] => {
  const first = viewerDay(now, tzOffsetMin) + 1;
  const days = Array.from({ length: IDEA_DAYS }, (_, i) => first + i);
  const added = new Map<number, number>();
  const order: number[] = [];
  for (let round = 1; round <= IDEAS_PER_DAY && order.length < count; round += 1) {
    for (const day of days) {
      if (order.length >= count) break;
      const mine = added.get(day) ?? 0;
      if (mine >= round || (busy.get(day) ?? 0) + mine >= MAX_PER_DAY) continue;
      added.set(day, mine + 1);
      order.push(day);
    }
  }
  const nth = new Map<number, number>();
  return order
    .sort((a, b) => a - b)
    .map((day) => {
      const total = Math.min(MAX_PER_DAY, (busy.get(day) ?? 0) + (added.get(day) ?? 0));
      const times = POST_TIMES[total]!;
      const index = (busy.get(day) ?? 0) + (nth.get(day) ?? 0);
      nth.set(day, (nth.get(day) ?? 0) + 1);
      return atViewerTime(day, times[Math.min(index, times.length - 1)]!, tzOffsetMin);
    });
};
