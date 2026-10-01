'use client';

import { useState } from 'react';
import { DayPanel } from './DayPanel';
import { DayTile, type DayActions } from './DayTile';
import { MiniDay } from './MiniDay';
import type { PlanDay } from './monthPlan';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Phone: the day open below the grid at first: today, else the month's first future day, else its first day. */
const firstPick = (days: PlanDay[]) => days.find((d) => d.today && d.inMonth) ?? days.find((d) => d.inMonth && !d.past) ?? days.find((d) => d.inMonth) ?? days[0];

/**
 * The month, Monday first. Tablet and desktop: each cell lists its posts. Phone (390px): small photo cells, and the
 * tapped day opens as a list below the grid.
 */
export function MonthGrid({ days, actions }: { days: PlanDay[]; actions: DayActions }) {
  const [selectedKey, setSelectedKey] = useState(() => firstPick(days)?.key ?? '');
  const selected = days.find((d) => d.key === selectedKey) ?? firstPick(days);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {WEEKDAYS.map((d) => <p key={d} className="px-1 text-center text-[10px] font-bold tracking-wide text-muted uppercase md:text-left md:text-xs">{d}</p>)}
        {days.map((day) => (
          <div key={day.key} className="min-w-0">
            <div className="md:hidden"><MiniDay day={day} selected={day.key === selected?.key} onSelect={() => setSelectedKey(day.key)} /></div>
            <div className="hidden md:block"><DayTile day={day} actions={actions} /></div>
          </div>
        ))}
      </div>
      {selected && <div className="md:hidden"><DayPanel day={selected} actions={actions} /></div>}
    </div>
  );
}
