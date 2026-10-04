// Calendar math for the "Add to calendar" picker, in the viewer's local time.

import { MAX_POSTS_PER_DAY } from '../../../types/admin/blitzSchedule';

export { MAX_POSTS_PER_DAY };

/** Times offered for a post, spread over the hours people scroll most. */
export const TIME_OPTIONS = ['09:00', '12:00', '15:00', '19:00', '21:00'];
/** What "Auto schedule" and a fresh pick use. */
export const DEFAULT_TIME = '19:00';
/** Days "Auto schedule" looks ahead for a day with room. */
const AUTO_HORIZON_DAYS = 120;

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const monthOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const startOfToday = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

/** The month's days, Monday first, whole weeks. */
export const monthDays = (month: Date): Date[] => {
  const first = monthOf(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const end = addDays(last, (7 - last.getDay()) % 7);
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
};

/** "19:00" on that day. */
export const atTime = (day: Date, time: string) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h ?? 19, m ?? 0);
};

/** True when a post at that time still leaves the render time to start (the server wants 10 minutes). */
export const isBookable = (at: Date, now = new Date()) => at.getTime() - now.getTime() > 15 * 60 * 1000;

/** How many "Best" days the picker shows, and how far ahead it looks for them. */
const BEST_COUNT = 3;
const BEST_HORIZON_DAYS = 14;

/** Posts per day, by day key. */
export type DayCounts = Map<string, number>;

export const isFull = (counts: DayCounts, day: Date) => (counts.get(dayKey(day)) ?? 0) >= MAX_POSTS_PER_DAY;

/** The days to suggest: empty days from tomorrow, never two in a row, so posts are spread out. */
export const bestDays = (counts: DayCounts, now = new Date()): Date[] => {
  const tomorrow = addDays(startOfToday(now), 1);
  const best: Date[] = [];
  for (let i = 0; i < BEST_HORIZON_DAYS && best.length < BEST_COUNT; i += 1) {
    const day = addDays(tomorrow, i);
    const last = best.at(-1);
    if (!counts.get(dayKey(day)) && (!last || day > addDays(last, 1))) best.push(day);
  }
  return best;
};

/** The first "Best" day at 7 PM; else the first day from tomorrow that is not full. */
export const autoSlot = (counts: DayCounts, now = new Date()): Date => {
  const best = bestDays(counts, now)[0];
  if (best) return atTime(best, DEFAULT_TIME);
  const tomorrow = addDays(startOfToday(now), 1);
  for (let i = 0; i < AUTO_HORIZON_DAYS; i += 1) {
    const day = addDays(tomorrow, i);
    if (!isFull(counts, day)) return atTime(day, DEFAULT_TIME);
  }
  return atTime(tomorrow, DEFAULT_TIME);
};

export const timeLabel = (time: string) => atTime(new Date(), time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** "Sun, Oct 5 · 7:00 PM" */
export const whenLabel = (at: Date) =>
  `${at.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
