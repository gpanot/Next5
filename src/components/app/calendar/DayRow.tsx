'use client';

import { Check, Plus, X } from 'lucide-react';
import { dayLabel, isPast, isToday } from '../../../lib/calendarDates';
import type { SlotDto } from '../../../types/business/calendar';

type Props = {
  date: string;
  slots: readonly SlotDto[];
  /** Briefly outlined after she tapped this day in the month. */
  highlighted?: boolean;
  onOpen: (slot: SlotDto) => void;
  onAdd: (date: string) => void;
  onRemove: (slot: SlotDto) => void;
  busySlotId?: string | null;
};

/** About four and a half thumbnails fit, so a cut-off one says "scroll for more". */
const THUMB = 'w-[calc((100%-2rem)/4.5)] shrink-0 sm:w-28';

/**
 * One day: add photos first, then that day's posts in a row she scrolls sideways.
 * No score here — she picked these photos already; the score helped then, not now.
 */
export const DayRow = ({ date, slots, highlighted = false, onOpen, onAdd, onRemove, busySlotId = null }: Props) => {
  const past = isPast(date);
  return (
    <section
      id={`day-${date}`}
      aria-label={dayLabel(date)}
      className={`flex scroll-mt-24 flex-col gap-2 rounded-2xl transition-shadow duration-500 ${highlighted ? 'ring-2 ring-app-accent ring-offset-4 ring-offset-app-bg' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`text-[13px] font-semibold uppercase tracking-wide ${isToday(date) ? 'text-app-accent' : 'text-app-muted'}`}>{dayLabel(date)}</h3>
        <p className="text-[12px] text-app-muted tabular-nums">{slots.length === 0 ? 'Nothing planned' : `${slots.length} post${slots.length === 1 ? '' : 's'}`}</p>
      </div>

      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!past && (
          <li className={THUMB}>
            <button
              type="button"
              onClick={() => onAdd(date)}
              aria-label={`Add photos to ${dayLabel(date)}`}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-app-line text-app-muted transition-colors duration-200 hover:border-app-accent/60 hover:bg-app-sunken hover:text-app-ink"
            >
              <Plus aria-hidden className="h-5 w-5" />
              <span className="text-[11px] font-medium">Add</span>
            </button>
          </li>
        )}
        {slots.map((slot) => {
          const posted = slot.status === 'posted';
          const label = slot.photo?.postKit?.hook ?? slot.materialLabel ?? slot.photo?.batchName ?? 'Post';
          return (
            <li key={slot.id} className={`relative ${THUMB}`}>
              <button
                type="button"
                onClick={() => onOpen(slot)}
                aria-label={`${posted ? 'Posted' : 'Open post'}: ${label}`}
                className="block aspect-[4/5] w-full overflow-hidden rounded-xl bg-app-sunken"
              >
                {slot.photo?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slot.photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                {posted && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-emerald-600/55">
                    <Check aria-hidden className="h-6 w-6 text-white" />
                  </span>
                )}
              </button>
              {!posted && (
                <button
                  type="button"
                  onClick={() => onRemove(slot)}
                  disabled={busySlotId === slot.id}
                  aria-label={`Remove from ${dayLabel(date)}: ${label}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80 disabled:opacity-50"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
