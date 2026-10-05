// Where a kept idea goes on the calendar. Waiting ideas have no day of their own on screen: each one kept fills the
// soonest empty day, one after the other. Pure, so it is tested on its own (tests/components/ideaPlacement.test.ts).

import { dayKey, MAX_PER_DAY, type PlanDay } from './monthPlan';
import type { TileEntry } from './tileModel';

/** Times a kept idea takes on a day, in order: the evening first, then around it. One post per time. */
export const KEEP_TIMES = ['19:00', '21:00', '17:00', '12:00', '09:00'] as const;

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** An idea kept on `day`: the first of KEEP_TIMES no post or kept idea there uses yet. Undefined when the day is full. */
export const keepTimeOn = (day: PlanDay, taken: Date[]): string | undefined => {
  if (taken.length >= MAX_PER_DAY) return undefined;
  const used = new Set(taken.map(hhmm));
  const time = KEEP_TIMES.find((t) => !used.has(t));
  if (!time) return undefined;
  const [h, m] = time.split(':').map(Number);
  const at = new Date(day.date);
  at.setHours(h!, m!, 0, 0);
  return at.toISOString();
};

/** The times of what fills a day: its posts (slideshows, videos) and kept ideas, besides the idea being placed. */
export const takenBy = (entries: TileEntry[], ideaId: string): Date[] =>
  entries.filter((e) => e.id !== ideaId && e.idea?.status !== 'proposed').map((e) => e.at);

/** Times on a day, once each (a keep still being saved and the post it became share one time). */
export const uniqueTimes = (times: Date[]): Date[] => [...new Map(times.map((t) => [t.getTime(), t])).values()];

/**
 * The time a kept idea gets: 7 PM on the soonest empty day from tomorrow (no slideshow, video or kept idea), however
 * far. Never stacks onto a day that already has a post (the day panel's "Add more posts" does that on purpose).
 * `takenOn` must also know the posts on days past the ones built.
 */
export const placeIdea = (ideaId: string, days: PlanDay[], takenOn: (day: PlanDay, ideaId: string) => Date[], now = new Date()): string | undefined => {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ahead = days.filter((d) => d.date >= tomorrow).sort((a, b) => a.date.getTime() - b.date.getTime());
  const empty = ahead.find((d) => takenOn(d, ideaId).length === 0);
  if (empty) return keepTimeOn(empty, []);
  // Past the days built (the month on screen): walk on, day by day, to the first one nothing is planned on.
  const last = ahead.at(-1)?.date ?? now;
  for (let n = 1; n <= 366; n++) {
    const date = new Date(last.getFullYear(), last.getMonth(), last.getDate() + n);
    const day: PlanDay = { key: dayKey(date), date, past: false, today: false, inMonth: false, slots: [] };
    if (takenOn(day, ideaId).length === 0) return keepTimeOn(day, []);
  }
  return undefined;
};
