// Pure: the Dates step. Which days a plan can use, how many posts it needs, and the default pick (the empty days).

import { PLAYBOOKS, type PlaybookId } from '../../../lib/realtorPlaybooks';

const DAY = 86_400_000;
/** Days offered, from today. */
export const WINDOW_DAYS = 28;
/** Most posts on one day. */
export const MAX_PER_DAY = 3;

export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00.000Z`) + n * DAY).toISOString().slice(0, 10);

export const offeredDays = (today: string): string[] => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i));

/** Moments that pick no days here: the open house fixes them, market update picks them with its places. */
export const skipsDates = (moment: string): boolean => moment === 'open_house' || moment === 'market_update';

/** Posts the plan makes (Evergreen: at most this many, one per day she picks). */
export const postsNeeded = (moment: string): number => PLAYBOOKS[moment as PlaybookId]?.beats.length ?? 0;

/** Default pick: the first empty days from `start`, one post each. */
export const defaultDays = (moment: string, today: string, busy: ReadonlySet<string>): string[] =>
  offeredDays(today).filter((d) => !busy.has(d)).slice(0, postsNeeded(moment));

/** Count per day, from a list of days that can repeat. */
export const countsOf = (days: readonly string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d, (counts.get(d) ?? 0) + 1);
  return counts;
};

/** Evergreen can post any number of days up to the pool; the others need exactly one day per post. */
export const isPickValid = (moment: string, days: readonly string[]): boolean =>
  moment === 'evergreen' ? days.length > 0 && days.length <= postsNeeded(moment) : days.length === postsNeeded(moment);
