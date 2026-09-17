'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { addMonths, groupByDay, isPast, isToday, monthGrid, monthLabel, monthOf, todayIso, WEEKDAY_LABELS } from '../../../lib/calendarDates';
import type { SlotDto } from '../../../types/business/calendar';
import { useDroppableDay } from './CalendarDnd';

type Props = { slots: SlotDto[]; onDay: (date: string) => void };

type CellProps = { date: string; inMonth: boolean; slots: readonly SlotDto[]; onDay: (date: string) => void };

/** One day in the month. Tapping it jumps to its row; dropping a photo on it moves the post there. */
const MonthDayCell = ({ date, inMonth, slots, onDay }: CellProps) => {
  const first = slots[0];
  const today = isToday(date);
  const day = Number(date.slice(8));
  const allPosted = slots.length > 0 && slots.every((sl) => sl.status === 'posted');
  // An empty day in the past does nothing when tapped, and takes no drop: she can only plan ahead.
  const canAdd = !isPast(date);
  const { setNodeRef, isOver } = useDroppableDay(date, !canAdd, 'month');
  const dropRing = isOver ? 'z-10 scale-110 ring-2 ring-app-accent ring-offset-2 ring-offset-app-panel' : '';

  if (!first) {
    return (
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => onDay(date)}
        disabled={!canAdd}
        aria-label={canAdd ? `Add photos to ${date}` : date}
        className={`flex aspect-square items-center justify-center rounded-lg text-[12px] tabular-nums transition duration-150 disabled:cursor-default ${dropRing} ${
          isOver ? 'bg-app-accent-soft font-semibold text-app-accent' : today ? 'bg-app-accent-soft font-semibold text-app-accent ring-1 ring-app-accent' : inMonth ? 'text-app-muted enabled:hover:bg-app-sunken' : 'text-app-muted/40'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onDay(date)}
      aria-label={`${slots.length} post${slots.length === 1 ? '' : 's'} on ${date}`}
      className={`relative aspect-square overflow-hidden rounded-lg bg-app-sunken ring-offset-1 ring-offset-app-panel transition duration-150 hover:scale-[1.04] ${
        dropRing || (today ? 'ring-2 ring-app-accent' : allPosted ? 'ring-1 ring-emerald-600/50' : 'ring-1 ring-app-line')
      } ${inMonth ? '' : 'opacity-60'}`}
    >
      {first.photo?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={first.photo.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* The day number has to stay readable on top of any photo. */}
      <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-1 pb-2 pt-0.5 text-left text-[11px] font-semibold tabular-nums text-white">
        {day}
      </span>
      {slots.length > 1 && (
        <span className="absolute bottom-0.5 right-0.5 rounded-full bg-black/65 px-1 text-[10px] font-semibold leading-4 tabular-nums text-white">
          {slots.length}
        </span>
      )}
      {allPosted && (
        <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/55">
          <Check aria-hidden className="h-4 w-4 text-white" />
        </span>
      )}
    </button>
  );
};

/**
 * Her month as a month: the first photo sits in the day, with a count when there are more,
 * so a glance shows how full the feed is. Tapping a day takes her to that day's row below,
 * where she adds or removes photos; carrying a photo onto a day moves it there.
 */
export const MonthGrid = ({ slots, onDay }: Props) => {
  const [month, setMonth] = useState(monthOf(todayIso()));
  const byDate = new Map(groupByDay(slots.filter((s) => s.status !== 'skipped')).map((d) => [d.date, d.slots]));
  const days = monthGrid(month);
  const planned = slots.filter((s) => monthOf(s.scheduledFor) === month && s.status === 'planned').length;
  const posted = slots.filter((s) => monthOf(s.scheduledFor) === month && s.status === 'posted').length;

  return (
    <section className="rounded-2xl border border-app-line bg-app-panel p-3 sm:p-4">
      <header className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-app-ink">{monthLabel(month)}</p>
          <p className="text-[12px] text-app-muted tabular-nums">{posted} posted · {planned} ready</p>
        </div>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </header>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <p key={label} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-app-muted">
            {label.slice(0, 1)}
          </p>
        ))}

        {days.map(({ date, inMonth }) => (
          <MonthDayCell key={date} date={date} inMonth={inMonth} slots={byDate.get(date) ?? []} onDay={onDay} />
        ))}
      </div>
    </section>
  );
};
