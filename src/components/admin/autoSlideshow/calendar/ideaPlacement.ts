// Where a kept idea goes on the calendar. Waiting ideas have no day of their own on screen: each one kept fills the
// soonest empty day, one after the other. Pure, so it is tested on its own (tests/components/ideaPlacement.test.ts).

import { IDEA_DAYS } from '../../../../types/admin/calendarIdeas';
import { MAX_PER_DAY, type PlanDay } from './monthPlan';
import type { TileEntry } from './tileModel';

const DAY_MS = 86_400_000;

/** An idea kept on `day`: 7 PM, 2 hours later for each post or kept idea already on it (as the server's "+"). */
export const keepTimeOn = (day: PlanDay, taken: number): string => {
  const at = new Date(day.date);
  at.setHours(Math.min(19 + 2 * taken, 23), 0, 0, 0);
  return at.toISOString();
};

/** What fills a day: its posts (slideshows, videos) and kept ideas, besides the idea being placed. */
export const takenBy = (entries: TileEntry[], ideaId: string): number =>
  entries.filter((e) => e.id !== ideaId && e.idea?.status !== 'proposed').length;

/**
 * The time a kept idea gets: the soonest empty day of the ideas window (tomorrow on). Once every day there has a post,
 * the soonest day with the fewest posts (up to MAX_PER_DAY). Undefined when every day is full.
 */
export const placeIdea = (ideaId: string, days: PlanDay[], takenOn: (day: PlanDay, ideaId: string) => number, now = new Date()): string | undefined => {
  const end = now.getTime() + (IDEA_DAYS + 1) * DAY_MS;
  const window = days.filter((d) => !d.past && !d.today && d.date.getTime() <= end);
  const load = new Map(window.map((d) => [d.key, takenOn(d, ideaId)]));
  const open = window.filter((d) => load.get(d.key)! < MAX_PER_DAY);
  if (open.length === 0) return undefined;
  const best = open.reduce((b, d) => (load.get(d.key)! < load.get(b.key)! ? d : b));
  return keepTimeOn(best, load.get(best.key)!);
};
