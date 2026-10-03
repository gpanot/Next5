'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { addMonths, dayKey, monthDays, monthOf, startOfToday } from './slots';

/** A post already on a day: its photo, or a dot when it has none. */
export type DayPost = { coverUrl: string | null; title: string; blitz: boolean };

type Props = {
  /** Posts on each day, by day key. */
  posts: Map<string, DayPost[]>;
  selected: Date | null;
  onSelect: (day: Date) => void;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Months ahead the arrows reach (the server takes up to 4). */
const MAX_MONTHS_AHEAD = 3;

function DayCell({ day, posts, inMonth, past, selected, onSelect }: { day: Date; posts: DayPost[]; inMonth: boolean; past: boolean; selected: boolean; onSelect: () => void }) {
  const cover = posts.find((p) => p.coverUrl)?.coverUrl ?? null;
  const label = `${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${posts.length ? `, ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}` : ''}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={past}
      aria-label={label}
      aria-pressed={selected}
      className={[
        'relative aspect-[4/5] w-full overflow-hidden rounded-lg border text-left transition active:scale-95 disabled:cursor-default disabled:opacity-35',
        selected ? 'border-[var(--ink,#000)] ring-2 ring-[var(--ink,#000)] dark:border-white dark:ring-white' : 'border-[var(--line,#e8e5e1)] hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600',
        inMonth ? '' : 'opacity-50',
        cover ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-[var(--paper,#fff)] dark:bg-neutral-900',
      ].join(' ')}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      )}
      <span className={`absolute top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${cover ? 'bg-black/55 text-white' : 'text-[var(--ink,#000)] dark:text-neutral-100'}`}>
        {day.getDate()}
      </span>
      {posts.length > 0 && (
        <span aria-hidden className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
          {posts.slice(0, 4).map((p, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ring-1 ring-white dark:ring-neutral-900 ${p.blitz ? 'bg-[var(--ready,#1e8049)]' : 'bg-neutral-400'}`} />
          ))}
        </span>
      )}
    </button>
  );
}

/** One month, Monday first. Past days are off; days with posts show their photo and a dot per post. */
export function MonthPicker({ posts, selected, onSelect }: Props) {
  const today = startOfToday();
  const [month, setMonth] = useState(() => monthOf(selected ?? today));
  const canPrev = month > monthOf(today);
  const canNext = month < addMonths(monthOf(today), MAX_MONTHS_AHEAD);
  const nav = 'flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink,#000)] transition hover:bg-neutral-100 active:scale-95 disabled:opacity-30 dark:text-neutral-100 dark:hover:bg-neutral-800';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} disabled={!canPrev} aria-label="Previous month" className={nav}>
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>
        <p className="text-[15px] font-bold text-[var(--ink,#000)] dark:text-neutral-100" aria-live="polite">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={!canNext} aria-label="Next month" className={nav}>
          <ChevronRight aria-hidden className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <p key={d} className="text-center text-[10px] font-bold tracking-wide text-[var(--mute,#7c7d82)] uppercase">{d}</p>
        ))}
        {monthDays(month).map((day) => (
          <DayCell
            key={dayKey(day)}
            day={day}
            posts={posts.get(dayKey(day)) ?? []}
            inMonth={day.getMonth() === month.getMonth()}
            past={day < today}
            selected={selected !== null && dayKey(selected) === dayKey(day)}
            onSelect={() => onSelect(day)}
          />
        ))}
      </div>
    </div>
  );
}
