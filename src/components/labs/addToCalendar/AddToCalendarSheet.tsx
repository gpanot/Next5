'use client';

import { CalendarCheck, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MonthPicker, type DayPost } from './MonthPicker';
import { atTime, autoSlot, bestDays, dayKey, DEFAULT_TIME, isBookable, TIME_OPTIONS } from './slots';

/** Resolves to null when done, else the error to show. */
type Action = () => Promise<string | null>;

/** The item's own place on the calendar, when it already has one. */
export type CalendarCurrent = {
  at: Date;
  /** "Approved for Sun, Oct 5 · 7:00 PM" */
  label: string;
  /** Off when it can no longer change (being made or posted). */
  movable: boolean;
  onRemove?: Action;
};

export type AddToCalendarProps = {
  /** Everything else on the calendar, by day key (the item itself left out, so it can move). */
  posts: Map<string, DayPost[]>;
  current?: CalendarCurrent | null;
  /** Puts the item on that day and time. */
  onSchedule: (at: Date) => Promise<string | null>;
  onClose: () => void;
  title?: string;
  /** Extra options for this kind of content, shown under the calendar. */
  children?: ReactNode;
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Day, busy state and actions. No time picker for now: a moved item keeps its time, a new one posts at 7 PM. */
function useAddToCalendar({ posts, current, onSchedule, onClose }: AddToCalendarProps) {
  const [day, setDay] = useState<Date | null>(current?.at ?? null);
  const [time] = useState(current && TIME_OPTIONS.includes(hhmm(current.at)) ? hhmm(current.at) : DEFAULT_TIME);
  const [busy, setBusy] = useState<'pick' | 'auto' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const counts = useMemo(() => new Map([...posts].map(([k, list]) => [k, list.length])), [posts]);
  const best = useMemo(() => new Set(bestDays(counts).map(dayKey)), [counts]);

  const act = async (how: 'pick' | 'auto' | 'remove', action: Action) => {
    setBusy(how);
    setError(null);
    const failure = await action().catch(() => 'Something went wrong. Try again.');
    setBusy(null);
    if (failure) setError(failure);
    else onClose();
  };
  const picked = day ? atTime(day, time) : null;
  const ready = busy === null && (!current || current.movable);
  return {
    day, setDay, busy, error, best, picked, ready,
    canConfirm: ready && picked !== null && isBookable(picked),
    confirm: () => picked && void act('pick', () => onSchedule(picked)),
    auto: () => void act('auto', () => onSchedule(autoSlot(counts))),
    remove: () => current?.onRemove && void act('remove', current.onRemove),
  };
}

function CurrentRow({ current, busy, onRemove }: { current: CalendarCurrent; busy: boolean; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-neutral-100 p-3 text-[13px] text-[var(--ink,#000)] dark:bg-neutral-900 dark:text-neutral-100">
      <CalendarCheck aria-hidden className="h-4 w-4 flex-none text-[var(--ready,#1e8049)]" />
      <span className="flex-1">{current.label}</span>
      {current.onRemove && current.movable && (
        <button type="button" onClick={onRemove} disabled={busy} className="min-h-11 px-2 font-semibold text-red-600 underline-offset-2 hover:underline disabled:opacity-40 dark:text-red-400">
          {busy ? 'Removing…' : 'Remove'}
        </button>
      )}
    </div>
  );
}

/**
 * "Add to calendar": pick a day and confirm, or "Auto schedule" on the first "Best" day. Full days (5 posts) are off.
 * Content-agnostic: the caller says what is already on the calendar and what scheduling does.
 */
export function AddToCalendarSheet(props: AddToCalendarProps) {
  const { current, onClose, title = 'Add to calendar', children } = props;
  const f = useAddToCalendar(props);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const ghost = 'flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition active:scale-95 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-100';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--paper,#fff)] shadow-xl sm:rounded-2xl dark:bg-neutral-950">
        <header className="flex items-start gap-3 border-b border-[var(--line,#e8e5e1)] p-4 dark:border-neutral-800">
          <h3 className="min-w-0 flex-1 self-center text-[16px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--mute,#7c7d82)] transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          {current && <CurrentRow current={current} busy={f.busy !== null} onRemove={f.remove} />}
          <MonthPicker posts={props.posts} best={f.best} selected={f.day} onSelect={f.setDay} />
          {children}
          {f.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{f.error}</p>}
        </div>
        <footer className="flex gap-2 border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
          <button type="button" onClick={f.auto} disabled={!f.ready} className={ghost}>
            {f.busy === 'auto' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden className="h-4 w-4" />} Auto schedule
          </button>
          <button type="button" onClick={f.confirm} disabled={!f.canConfirm} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40">
            {f.busy === 'pick' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {f.picked ? `Schedule ${f.picked.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Pick a day'}
          </button>
        </footer>
      </div>
    </div>
  );
}
