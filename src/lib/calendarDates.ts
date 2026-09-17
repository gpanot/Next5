/** Date labels for the calendar. Pure — slots are whole days, read in UTC (docs 11-calendar-plan §5.4). */

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const todayIso = (now = new Date()): string => now.toISOString().slice(0, 10);

const addDays = (iso: string, days: number): string => new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

/** "Today", "Tomorrow", "Yesterday", else "Tue 15 Sep". */
export const dayLabel = (iso: string, now = new Date()): string => {
  const today = todayIso(now);
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  if (iso === addDays(today, -1)) return 'Yesterday';
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export const isPast = (iso: string, now = new Date()): boolean => iso < todayIso(now);
export const isToday = (iso: string, now = new Date()): boolean => iso === todayIso(now);

/** Groups slots by day, in date order, so the page reads as an agenda. */
export const groupByDay = <T extends { scheduledFor: string }>(slots: readonly T[]): { date: string; slots: T[] }[] => {
  const days = new Map<string, T[]>();
  for (const slot of slots) days.set(slot.scheduledFor, [...(days.get(slot.scheduledFor) ?? []), slot]);
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, slots: list }));
};

/** `YYYY-MM` for a date string. */
export const monthOf = (iso: string): string => iso.slice(0, 7);

/** "September 2026". */
export const monthLabel = (month: string): string =>
  new Date(`${month}-15T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const addMonths = (month: string, delta: number): string => {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year!, (m! - 1) + delta, 1));
  return d.toISOString().slice(0, 7);
};

/**
 * The calendar grid for a month: whole weeks from Sunday, so the month always
 * sits in a rectangle. Days outside the month are included and flagged.
 */
export const monthGrid = (month: string): { date: string; inMonth: boolean }[] => {
  const first = new Date(`${month}-01T00:00:00Z`);
  const start = new Date(first.getTime() - first.getUTCDay() * 86_400_000);
  const days: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start.getTime() + i * 86_400_000);
    const date = day.toISOString().slice(0, 10);
    days.push({ date, inMonth: monthOf(date) === month });
    // Stop after the week that closes the month.
    if (i >= 27 && day.getUTCDay() === 6 && monthOf(date) !== month) break;
  }
  return days;
};

/** Her posting days from today for `days` days, as `YYYY-MM-DD` — shown even when nothing is planned yet. */
export const upcomingPostingDays = (weekdays: readonly number[], days: number, now = new Date()): string[] => {
  const start = new Date(`${todayIso(now)}T00:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start.getTime() + i * 86_400_000);
    if (weekdays.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
};
