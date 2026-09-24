// server-only
/**
 * Mocked calendar slot assignment for Campaign Studio v1.
 * Distributes accepted candidates across weekdays based on cadence config.
 */

export type Cadence = {
  postsPerWeek?: number;
  weekdays?: string[];
};

const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Generate the next `count` slot dates starting from tomorrow, respecting weekday constraints.
 * Returns dates at 9am local time.
 */
export function slotDates(cadence: Cadence, count: number): Date[] {
  const weekdays = (cadence.weekdays ?? ['mon', 'wed', 'fri'])
    .map((d) => DAY_ORDER.indexOf(d.toLowerCase()))
    .filter((d) => d >= 0)
    .sort();

  if (weekdays.length === 0) weekdays.push(1, 3, 5); // mon/wed/fri fallback

  const dates: Date[] = [];
  // Start from tomorrow (9am) so same-day posts are never scheduled
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);

  let cursor = new Date(start);
  let safety = 0;

  while (dates.length < count && safety < 365) {
    if (weekdays.includes(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }

  return dates;
}
