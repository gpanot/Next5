/**
 * Pure calendar maths: which dates a member posts on, and which photo goes in each.
 * No database, no clock of its own — everything here is testable from fixtures.
 * Plan: docs/business-studios/11-calendar-plan.md §2.1.
 */

import type { ScoreDetails } from '../../lib/scoreRubric';

export type SlotOfDay = 'morning' | 'midday' | 'evening';
export type BestFor = ScoreDetails['bestFor'];

/** A photo waiting for a date. */
export type PlaceableItem = {
  id: string;
  score: number | null;
  bestFor: BestFor | null;
  sceneId: string | null;
  createdAt: Date;
};

export type Placement = { itemId: string; scheduledFor: string; slotOfDay: SlotOfDay };

const DAY = 86_400_000;
/** A photo of her face belongs on her profile, not in the feed. */
const NEVER_SCHEDULE: readonly BestFor[] = ['profile'];
const LOOKAHEAD_DAYS = 400;

/** `YYYY-MM-DD` for a date, read in UTC. Slots are whole days: the time of day is a label, not a moment. */
export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Midnight UTC on the day `d` falls in. */
export const startOfDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const isValidWeekdays = (weekdays: readonly number[]): boolean =>
  weekdays.length > 0 && weekdays.length <= 7 && weekdays.every((n) => Number.isInteger(n) && n >= 0 && n <= 6);

/**
 * The next `count` dates falling on one of `weekdays`, starting from `from` (the day itself counts),
 * skipping any date already `taken`. Returns `YYYY-MM-DD` strings in order.
 */
export const nextSlotDates = (from: Date, weekdays: readonly number[], count: number, taken: ReadonlySet<string> = new Set()): string[] => {
  if (!isValidWeekdays(weekdays) || count <= 0) return [];
  const days = new Set(weekdays);
  const dates: string[] = [];
  const cursor = startOfDay(from);
  for (let i = 0; i < LOOKAHEAD_DAYS && dates.length < count; i += 1) {
    const day = new Date(cursor.getTime() + i * DAY);
    const iso = isoDate(day);
    if (days.has(day.getUTCDay()) && !taken.has(iso)) dates.push(iso);
  }
  return dates;
};

/** How many posting days fall in `[from, until)` — what autopilot must keep stocked. */
export const slotDatesUntil = (from: Date, until: Date, weekdays: readonly number[], taken: ReadonlySet<string> = new Set()): string[] => {
  if (!isValidWeekdays(weekdays) || until <= from) return [];
  const limit = isoDate(startOfDay(until));
  return nextSlotDates(from, weekdays, Math.ceil((until.getTime() - from.getTime()) / DAY) + 1, taken).filter((d) => d < limit);
};

/**
 * Her best photo goes out first, and no two posts in a row come from the same scene —
 * a feed of six near-identical shots is what she is paying us to stop.
 */
export const orderForCalendar = (items: readonly PlaceableItem[]): PlaceableItem[] => {
  const pool = items
    .filter((i) => !(i.bestFor && NEVER_SCHEDULE.includes(i.bestFor)))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));

  const ordered: PlaceableItem[] = [];
  const remaining = [...pool];
  while (remaining.length > 0) {
    const last = ordered.at(-1);
    // The best photo that isn't a repeat of the one before it; if they all are, take the best.
    const index = last?.sceneId ? Math.max(0, remaining.findIndex((i) => i.sceneId !== last.sceneId)) : 0;
    ordered.push(...remaining.splice(index, 1));
  }
  return ordered;
};

/** A `story` photo is a same-day extra, so it sits in the morning; everything else is the evening post. */
export const slotOfDayFor = (item: PlaceableItem): SlotOfDay => (item.bestFor === 'story' ? 'morning' : 'evening');

/** Pairs ordered photos with open dates. Stops at whichever runs out first. */
export const placeItems = (items: readonly PlaceableItem[], dates: readonly string[]): Placement[] =>
  orderForCalendar(items)
    .slice(0, dates.length)
    .map((item, i) => ({ itemId: item.id, scheduledFor: dates[i]!, slotOfDay: slotOfDayFor(item) }));

/** Start of the rolling window the promise is measured over. */
export const windowStart = (now: Date, days: number): Date => new Date(now.getTime() - days * DAY);
