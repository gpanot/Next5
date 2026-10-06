'use client';

import type { ReactNode } from 'react';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import { DOT } from './CanvasTile';
import type { PlanDay } from './monthPlan';
import { useDroppableDay } from './SlideshowDnd';
import { STATUS_LABELS, type TileEntry } from './tileModel';

type Props = {
  days: PlanDay[];
  entriesOf: (day: PlanDay) => TileEntry[];
  selectedKey: string | null;
  focusKey: string | null;
  onSelect: (key: string) => void;
  /** The day's posts and ideas (DayDetail), shown under its row on phones and tablets (null on wide screens). */
  detail: (day: PlanDay) => ReactNode;
};

const timeOf = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const statusLabel = (e: TileEntry) => (e.status === 'failed' ? 'Failed' : STATUS_LABELS[e.status]);

/** One post of the day: small cover, time, first line, status. */
function EntryLine({ entry }: { entry: TileEntry }) {
  return (
    <span className="flex items-center gap-3">
      <span className={`relative aspect-[4/5] w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 ${entry.status === 'making' ? 'grayscale' : ''}`}>
        {entry.cover && <CoverMedia src={entry.cover} video={entry.coverIsVideo} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink dark:text-zinc-100">{entry.caption || 'Untitled post'}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {timeOf(entry.at)}
          <span aria-hidden>·</span>
          <span aria-hidden className={`h-2 w-2 rounded-full ${entry.status === 'ready' ? 'bg-zinc-900 dark:bg-white' : entry.status === 'idea' ? 'border border-blue-600' : DOT[entry.status]}`} />
          {statusLabel(entry)}
        </span>
      </span>
    </span>
  );
}

/** One day: date on the left, its posts on the right. Tap to open the day; a dragged post drops on it. */
function DayRow({ day, entries, selected, onSelect }: { day: PlanDay; entries: TileEntry[]; selected: boolean; onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppableDay('list', day.key, day.past);
  const ring = selected || isOver ? 'border-blue-600 ring-2 ring-blue-600' : entries.length === 0 ? 'border-dashed border-zinc-300 dark:border-zinc-700' : 'border-line dark:border-zinc-800';
  return (
    <button ref={setNodeRef} type="button" onClick={onSelect} aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-xl border bg-white p-3 text-left transition hover:bg-zinc-50 active:scale-[0.99] dark:bg-zinc-900 dark:hover:bg-zinc-800/60 ${ring} ${day.past ? 'opacity-60' : ''}`}>
      <span className="flex w-11 shrink-0 flex-col items-center">
        <span className="text-[10px] font-bold tracking-wide text-zinc-500 uppercase">{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-base font-extrabold ${day.today ? 'bg-blue-600 text-white' : 'text-ink dark:text-zinc-100'}`}>{day.date.getDate()}</span>
      </span>
      {entries.length > 0 ? (
        <span className="flex min-w-0 flex-1 flex-col gap-2">{entries.map((e) => <EntryLine key={e.id} entry={e} />)}</span>
      ) : (
        <span className="flex min-h-8 flex-1 items-center text-sm font-semibold text-zinc-400 dark:text-zinc-500">+ Add post</span>
      )}
    </button>
  );
}

/**
 * The month as a list, one row per day: days with posts, and the empty days still to come (past empty days are left
 * out). Same taps and drops as the grid; the open day shows under its row on smaller screens.
 */
export function MonthList({ days, entriesOf, selectedKey, focusKey, onSelect, detail }: Props) {
  const rows = days.filter((d) => d.inMonth).map((day) => ({ day, entries: entriesOf(day) })).filter((r) => !r.day.past || r.entries.length > 0);
  if (rows.length === 0) return <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-muted dark:border-zinc-700">No posts this month.</p>;
  return (
    <ul className="space-y-2">
      {rows.map(({ day, entries }) => (
        <li key={day.key} className="space-y-2">
          <DayRow day={day} entries={entries} selected={day.key === selectedKey || day.key === focusKey} onSelect={() => onSelect(day.key)} />
          {day.key === selectedKey && <div className="lg:hidden">{detail(day)}</div>}
        </li>
      ))}
    </ul>
  );
}
