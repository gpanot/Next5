'use client';

import { CalendarClock } from 'lucide-react';

/** Wall-clock open house time; `source` says whether Zillow gave it or she typed it (§3.2.1). */
export type EventDraft = { date: string; start: string; end: string; source: 'zillow' | 'typed' };

type Props = { value: EventDraft; onChange: (next: EventDraft) => void };

const INPUT = 'h-11 w-full rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink transition-colors duration-200 focus:border-app-accent focus:outline-none';

export const isEventValid = (e: EventDraft | null, today: string) => Boolean(e && e.date >= today && /^\d{2}:\d{2}$/.test(e.start) && (!e.end || e.end > e.start));

/** First upcoming Zillow open house, as a draft; null when Zillow has none. */
export const zillowEventOf = (openHouses: { start: string; end: string | null }[], today: string): EventDraft | null => {
  const next = openHouses.filter((o) => o.start.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start))[0];
  return next ? { date: next.start.slice(0, 10), start: next.start.slice(11, 16), end: next.end?.slice(11, 16) ?? '', source: 'zillow' } : null;
};

export const OpenHouseForm = ({ value, onChange }: Props) => {
  const today = new Date().toISOString().slice(0, 10);
  const set = (patch: Partial<EventDraft>) => onChange({ ...value, ...patch, source: 'typed' });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <p className="flex items-center gap-2 text-[14px] font-medium text-app-ink">
        <CalendarClock aria-hidden className="h-4 w-4 text-app-accent" /> When is the open house?
      </p>
      {value.source === 'zillow' && <p className="text-[12px] text-app-muted">From Zillow. Change it if it moved.</p>}
      <input type="date" aria-label="Open house day" min={today} value={value.date} onChange={(e) => set({ date: e.target.value })} className={INPUT} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[12px] text-app-muted">
          Starts
          <input type="time" step={900} value={value.start} onChange={(e) => set({ start: e.target.value })} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-app-muted">
          Ends
          <input type="time" step={900} value={value.end} onChange={(e) => set({ end: e.target.value })} className={INPUT} />
        </label>
      </div>
      <p className="text-[12px] text-app-muted">3 posts: 2 days before, the day before, and the morning of.</p>
    </div>
  );
};
