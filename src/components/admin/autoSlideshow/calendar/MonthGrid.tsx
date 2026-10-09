'use client';

import type { ReactNode } from 'react';
import { CanvasTile } from './CanvasTile';
import { MiniDay } from './MiniDay';
import type { PlanDay } from './monthPlan';
import type { TileEntry } from './tileModel';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Column headers starting on the grid's first day (Monday, or today's weekday when the month starts at today). */
const weekdaysFrom = (first: Date | undefined) => {
  const offset = first ? (first.getDay() + 6) % 7 : 0;
  return [...WEEKDAYS.slice(offset), ...WEEKDAYS.slice(0, offset)];
};

/** The day open below the grid (phones and tablets) before one is picked: today, else the month's first future day. */
const firstPick = (days: PlanDay[]) => days.find((d) => d.today && d.inMonth) ?? days.find((d) => d.inMonth && !d.past) ?? days.find((d) => d.inMonth) ?? days[0];

type Props = {
  days: PlanDay[];
  entriesOf: (day: PlanDay) => TileEntry[];
  /** The day the user opened; null until one is. */
  selectedKey: string | null;
  /** The day of the idea in focus in the ideas deck: ringed in blue. */
  focusKey: string | null;
  onSelect: (key: string) => void;
  /** The day's posts and ideas (DayDetail). Wide screens show it on the right, smaller ones below the grid. */
  detail: (day: PlanDay) => ReactNode;
};

/**
 * The month, Monday first. Tablet and desktop: photo tiles as in the canvas. Phone (390px): small photo cells. A tapped
 * day opens on the right on wide screens, below the grid on smaller ones.
 */
export function MonthGrid({ days, entriesOf, selectedKey, focusKey, onSelect, detail }: Props) {
  const below = days.find((d) => d.key === selectedKey) ?? firstPick(days);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 md:gap-x-2.5 md:gap-y-3">
        {weekdaysFrom(days[0]?.date).map((d) => <p key={d} className="px-1 text-center text-[10px] font-bold tracking-wide text-zinc-500 uppercase md:text-left md:text-xs md:normal-case">{d}</p>)}
        {days.map((day) => {
          const entries = entriesOf(day);
          const focused = day.key === selectedKey || day.key === focusKey;
          return (
            <div key={day.key} className="min-w-0">
              <div className="md:hidden"><MiniDay day={day} entries={entries} selected={day.key === below?.key} focused={day.key === focusKey} onSelect={() => onSelect(day.key)} /></div>
              <div className="hidden md:block"><CanvasTile day={day} entries={entries} focused={focused} onOpen={() => onSelect(day.key)} /></div>
            </div>
          );
        })}
      </div>
      {below && <div className="lg:hidden">{detail(below)}</div>}
    </div>
  );
}
