'use client';

import { CalendarDays, List } from 'lucide-react';
import { DOT } from './CanvasTile';
import { STATUS_LABELS, type TileStatus } from './tileModel';
import type { CalendarView } from './useCalendarStore';

/** Statuses the legend names. Kept, Making and Ready left out: the tiles and the day view already say it. */
const SHOWN: TileStatus[] = ['scheduled'];

type Props = { view?: CalendarView; onView?: (view: CalendarView) => void };

/** Grid ⇄ list by day: the icon shows the view a tap switches to. */
function ViewToggle({ view, onView }: { view: CalendarView; onView: (view: CalendarView) => void }) {
  const toList = view === 'grid';
  const Icon = toList ? List : CalendarDays;
  const label = toList ? 'Show as a list by day' : 'Show as a calendar';
  return (
    <button type="button" onClick={() => onView(toList ? 'list' : 'grid')} aria-label={label} title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 active:scale-90 dark:text-zinc-200 dark:hover:bg-zinc-800">
      <Icon aria-hidden className="h-5 w-5" />
    </button>
  );
}

/** What the tile dots mean, and the grid/list switch. Waiting ideas are not on the calendar (they get a day when kept), so no idea dot. */
export function StatusLegend({ view, onView }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      {(Object.keys(STATUS_LABELS) as Exclude<TileStatus, 'failed' | 'idea'>[]).filter((s) => SHOWN.includes(s)).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${s === 'ready' ? 'bg-zinc-900 dark:bg-white' : DOT[s]}`} />
          {STATUS_LABELS[s]}
        </span>
      ))}
      {view && onView && <ViewToggle view={view} onView={onView} />}
    </div>
  );
}
