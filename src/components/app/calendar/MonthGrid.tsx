'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { addMonths, isToday, monthGrid, monthLabel, monthOf, todayIso, WEEKDAY_LABELS } from '../../../lib/calendarDates';
import type { SlotDto } from '../../../types/business/calendar';

type Props = { slots: SlotDto[]; onOpen: (slot: SlotDto) => void };

/**
 * Her month as a month: the photo itself sits in the day, so a glance shows
 * how full the feed is. Tapping a day opens that post.
 */
export const MonthGrid = ({ slots, onOpen }: Props) => {
  const [month, setMonth] = useState(monthOf(todayIso()));
  const byDate = new Map(slots.map((s) => [s.scheduledFor, s]));
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

        {days.map(({ date, inMonth }) => {
          const slot = byDate.get(date);
          const today = isToday(date);
          const day = Number(date.slice(8));
          const posted = slot?.status === 'posted';
          const skipped = slot?.status === 'skipped';

          if (!slot) {
            return (
              <div
                key={date}
                className={`flex aspect-square items-center justify-center rounded-lg text-[12px] tabular-nums ${
                  today ? 'bg-app-accent-soft font-semibold text-app-accent ring-1 ring-app-accent' : inMonth ? 'text-app-muted' : 'text-app-muted/40'
                }`}
              >
                {day}
              </div>
            );
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => onOpen(slot)}
              aria-label={`${posted ? 'Posted' : 'Post'} on ${date}`}
              className={`relative aspect-square overflow-hidden rounded-lg bg-app-sunken ring-offset-1 ring-offset-app-panel transition-transform duration-200 hover:scale-[1.04] ${
                today ? 'ring-2 ring-app-accent' : posted ? 'ring-1 ring-emerald-600/50' : 'ring-1 ring-app-line'
              } ${skipped ? 'opacity-40' : ''} ${inMonth ? '' : 'opacity-60'}`}
            >
              {slot.photo?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              {/* The day number has to stay readable on top of any photo. */}
              <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-1 pb-2 pt-0.5 text-left text-[11px] font-semibold tabular-nums text-white">
                {day}
              </span>
              {posted && (
                <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/55">
                  <Check aria-hidden className="h-4 w-4 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
