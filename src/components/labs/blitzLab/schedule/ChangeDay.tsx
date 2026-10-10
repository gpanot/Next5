'use client';

import { CalendarDays, Loader2 } from 'lucide-react';
import { dayKey, startOfToday } from '../../addToCalendar/slots';

type Props = {
  /** The video's time now (ISO). */
  scheduledAt: string;
  busy: boolean;
  /** The same time of day on the picked day. */
  onMove: (at: Date) => void;
};

/** `from`'s time of day on the day `key` (YYYY-MM-DD), in the viewer's time zone. */
const onDay = (key: string, from: Date): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!, from.getHours(), from.getMinutes());
};

/** "Change day": the phone's own date picker, styled as a pill. The time of day stays. Today onward only. */
export function ChangeDay({ scheduledAt, busy, onMove }: Props) {
  const from = new Date(scheduledAt);
  return (
    <label className="relative inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CalendarDays aria-hidden className="h-4 w-4" />}
      Change day
      <input
        type="date"
        aria-label="Change day"
        value={dayKey(from)}
        min={dayKey(startOfToday())}
        disabled={busy}
        // Desktop browsers only open the picker from their own icon, which is hidden here.
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            // Not supported, or already open: the input itself still takes the tap.
          }
        }}
        onChange={(e) => e.target.value && onMove(onDay(e.target.value, from))}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
