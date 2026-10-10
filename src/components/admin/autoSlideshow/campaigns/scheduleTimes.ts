import { spreadTimes } from '../schedule';

export type SpreadMode = 'daily' | 'sameDay';

/** Hours between posts sent the same day. */
const SAME_DAY_GAP_HOURS = 2;

/** "YYYY-MM-DDTHH:mm" in local time, the value of a datetime-local input. */
export const toLocalInput = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * A time for each of `count` slideshows: one a day at `time` from `startDate`, or all on `startDate`, two hours
 * apart from `time`. Times already past are dropped by `spreadTimes`, so "daily" may start a day later.
 */
export const planTimes = (count: number, mode: SpreadMode, startDate: string, time: string, now = new Date()): Date[] => {
  if (mode === 'daily') return spreadTimes(count, startDate, [time], 1, now);
  const [y, m, d] = startDate.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return Array.from({ length: count }, (_, i) => new Date(y!, m! - 1, d!, h! + i * SAME_DAY_GAP_HOURS, min));
};
