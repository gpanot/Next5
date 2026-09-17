'use client';

import { Check, Plus, X } from 'lucide-react';
import { dayLabel, isPast, isToday } from '../../../lib/calendarDates';
import type { SlotDto } from '../../../types/business/calendar';
import { NO_LONG_PRESS_MENU, useCalendarDrag, useDraggableSlot, useDroppableDay } from './CalendarDnd';

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

type ThumbProps = { slot: SlotDto; date: string; onOpen: (slot: SlotDto) => void; onRemove: (slot: SlotDto) => void; busy: boolean };

const DayThumb = ({ slot, date, onOpen, onRemove, busy }: ThumbProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggableSlot(slot);
  const { justDropped } = useCalendarDrag();
  const posted = slot.status === 'posted';
  const label = slot.photo?.postKit?.hook ?? slot.materialLabel ?? slot.photo?.batchName ?? 'Post';

  return (
    <li className={`relative ${THUMB} transition-opacity duration-150 ${isDragging ? 'opacity-30' : ''}`}>
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => {
          if (!justDropped()) onOpen(slot);
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${posted ? 'Posted' : 'Open post'}: ${label}`}
        aria-roledescription={posted ? undefined : 'Photo you can hold and drag to another day'}
        className={`block aspect-[4/5] w-full overflow-hidden rounded-xl bg-app-sunken ${NO_LONG_PRESS_MENU}`}
      >
        {slot.photo?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.photo.url} alt="" loading="lazy" draggable={false} className="pointer-events-none h-full w-full object-cover" />
        )}
        {posted && (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-emerald-600/55">
            <Check aria-hidden className="h-6 w-6 text-white" />
          </span>
        )}
      </button>
      {!posted && !isDragging && (
        <button
          type="button"
          onClick={() => onRemove(slot)}
          disabled={busy}
          aria-label={`Remove from ${dayLabel(date)}: ${label}`}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80 disabled:opacity-50"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
};

/**
 * One day: add photos first, then that day's posts in a row she scrolls sideways.
 * Hold a photo to carry it to another day; the day under her finger lights up.
 * No score here — she picked these photos already; the score helped then, not now.
 */
export const DayRow = ({ date, slots, highlighted = false, onOpen, onAdd, onRemove, busySlotId = null }: Props) => {
  const past = isPast(date);
  const { activeId } = useCalendarDrag();
  const { setNodeRef, isOver } = useDroppableDay(date, past, 'row');
  const carrying = activeId !== null && !past;
  const fromHere = slots.some((s) => s.id === activeId);

  return (
    <section
      ref={setNodeRef}
      id={`day-${date}`}
      aria-label={dayLabel(date)}
      className={`flex scroll-mt-24 flex-col gap-2 rounded-2xl p-2 -m-2 transition-colors duration-150 ${
        isOver && !fromHere ? 'bg-app-accent-soft ring-2 ring-app-accent' : carrying ? 'outline-dashed outline-1 outline-app-line' : highlighted ? 'ring-2 ring-app-accent' : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`text-[13px] font-semibold uppercase tracking-wide ${isToday(date) ? 'text-app-accent' : 'text-app-muted'}`}>{dayLabel(date)}</h3>
        <p className={`text-[12px] tabular-nums ${isOver && !fromHere ? 'font-medium text-app-accent' : 'text-app-muted'}`}>
          {isOver && !fromHere ? 'Drop to move here' : slots.length === 0 ? 'Nothing planned' : `${slots.length} post${slots.length === 1 ? '' : 's'}`}
        </p>
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
        {slots.map((slot) => (
          <DayThumb key={slot.id} slot={slot} date={date} onOpen={onOpen} onRemove={onRemove} busy={busySlotId === slot.id} />
        ))}
      </ul>
    </section>
  );
};
