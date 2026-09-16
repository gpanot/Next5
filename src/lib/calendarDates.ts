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
