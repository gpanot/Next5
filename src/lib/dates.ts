/**
 * Date formatting helpers — pure functions, locale-fixed to en-US.
 */

/**
 * Format a date as "Sep 14, 2026".
 * Accepts a Date, ISO string, or timestamp.
 */
export const formatShortDate = (date: Date | string | number): string =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/**
 * Format a date as a relative string ("2 min ago", "3 days ago").
 * Falls back to `formatShortDate` for dates older than 30 days.
 */
export const formatRelative = (date: Date | string | number): string => {
  const now = Date.now();
  const ts  = new Date(date).getTime();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1_000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return 'just now';
  if (diffMin < 60)  return `${diffMin} min ago`;
  if (diffHr  < 24)  return `${diffHr} hr ago`;
  if (diffDay <  2)  return 'yesterday';
  if (diffDay < 30)  return `${diffDay} days ago`;
  return formatShortDate(date);
};

/**
 * Adds calendar months, clamping to the last day of the target month
 * (Jan 31 + 1 month → Feb 28/29). Time of day is preserved. Uses UTC fields.
 */
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};
