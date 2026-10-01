'use client';

import { MAX_PER_DAY, type PlanDay, type PlanSlot } from './monthPlan';
import { SlotRow } from './SlotRow';
import { badgeOf } from './slotBadge';
import { formatElapsed, useNow } from '../../shared/runClock';
import { TYPICAL_RUN_MS } from '../RunEta';
import { useDroppableDay } from './SlideshowDnd';

export type DayActions = {
  /** When the run's current work started: the "Making… 1:59 left" countdown. */
  startedAt: string;
  /** Posts wanted on a day (0 removes it). Nothing is made until "Generate". */
  onSetCount: (key: string, n: number) => void;
  onOpen: (slideshowId: string) => void;
};

type Filled = PlanSlot & { item: NonNullable<PlanSlot['item']> };
const filledOf = (day: PlanDay) => day.slots.filter((s): s is Filled => s.item !== null);
export const emptyOf = (day: PlanDay) => (day.past ? 0 : day.slots.length - filledOf(day).length);

type Size = 'inline' | 'big' | 'touch';

/** "+ Add post": this day wants 1 post. */
function AddButton({ day, actions, size }: { day: PlanDay; actions: DayActions; size: Size }) {
  const big = size === 'big';
  return (
    <button
      onClick={() => actions.onSetCount(day.key, 1)}
      className={`flex w-full items-center justify-center gap-1 rounded-lg font-semibold text-blue-600 transition hover:bg-blue-50 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-950 ${big ? 'min-h-11 flex-1 flex-col text-xs' : size === 'touch' ? 'min-h-12 text-sm' : 'min-h-8 text-[11px]'}`}
    >
      <span aria-hidden className={big ? 'flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 text-lg dark:border-blue-900' : ''}>+</span>
      Add post
    </button>
  );
}

const round = 'flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-semibold text-blue-600 transition active:scale-90 disabled:opacity-30 dark:border-blue-900 dark:bg-zinc-900 dark:text-blue-400';

/** "− N +": posts on this day only, 1 to 5. − never goes below the slideshows already there; at 1 on an empty day it removes it. */
function DayStepper({ day, actions, big }: { day: PlanDay; actions: DayActions; big: boolean }) {
  const count = day.slots.length;
  const floor = filledOf(day).length;
  const label = day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <div className={`flex flex-col items-center justify-center gap-1 ${big ? 'flex-1' : 'py-1'}`}>
      <div className="flex items-center gap-1.5" role="group" aria-label={`Posts on ${label}`}>
        <button onClick={() => actions.onSetCount(day.key, count - 1)} disabled={count <= floor && floor > 0} aria-label={`One less post on ${label}`} className={round}>−</button>
        <span className="w-5 text-center text-lg font-extrabold text-ink tabular-nums dark:text-zinc-100" aria-live="polite">{count}</span>
        <button onClick={() => actions.onSetCount(day.key, count + 1)} disabled={count >= MAX_PER_DAY} aria-label={`One more post on ${label}`} className={round}>+</button>
      </div>
      <span className="text-center text-[10px] leading-tight text-muted">{count === 1 ? 'post' : 'posts'} this day</span>
    </div>
  );
}

/** "Making… 1:59 left", counting down from the run's start; "Almost done…" once past the usual time. */
function MakingLeft({ startedAt }: { startedAt: string }) {
  const now = useNow(true);
  const left = TYPICAL_RUN_MS - (now - new Date(startedAt).getTime());
  return (
    <p className="flex flex-1 items-center justify-center gap-1.5 py-2 text-center text-xs font-semibold text-muted" aria-live="off">
      <span aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
      {left > 0 ? <span>Making… <span className="tabular-nums">{formatElapsed(left)}</span> left</span> : 'Almost done…'}
    </p>
  );
}

/** A future day's add area: the countdown while one of its slideshows is being made, − N + once it has posts (or
 *  wants some), else "+ Add post". */
export function DayAdd({ day, actions, size }: { day: PlanDay; actions: DayActions; size: Size }) {
  if (day.past) return null;
  if (day.slots.some((s) => s.item?.kind === 'making')) return <MakingLeft startedAt={actions.startedAt} />;
  if (day.slots.length > 0) return <DayStepper day={day} actions={actions} big={size === 'big' && filledOf(day).length === 0} />;
  return <AddButton day={day} actions={actions} size={size} />;
}

/** Tablet and desktop: one month cell with its date, its posts, and "+ Add post" for empty slots. */
export function DayTile({ day, actions }: { day: PlanDay; actions: DayActions }) {
  const filled = filledOf(day);
  const shown = filled.filter((s) => s.item.kind !== 'making');
  const empty = emptyOf(day);
  const total = filled.length + empty;
  const room = !day.past && (empty > 0 || day.slots.length === 0);
  const { setNodeRef, isOver } = useDroppableDay('tile', day.key, day.past);
  const muted = !day.inMonth || (day.past && filled.length === 0);
  const big = shown.length === 1 && filled.length === 1 && empty === 0;
  const badge = big ? badgeOf(shown[0]!.item) : null;
  return (
    <div ref={setNodeRef} className={`${isOver ? 'ring-2 ring-blue-600' : ''} flex min-h-36 flex-col gap-1 rounded-xl border p-2 transition ${room && filled.length === 0 ? 'border-dashed border-blue-200 bg-blue-50/30 dark:border-blue-900/60 dark:bg-blue-950/10' : 'border-line bg-white dark:border-zinc-800 dark:bg-zinc-900'} ${muted ? 'opacity-50' : ''}`}>
      <p className="flex items-center gap-1.5 px-0.5">
        <span className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold ${day.today ? 'bg-blue-600 px-1.5 text-white' : 'text-ink dark:text-zinc-100'}`}>{day.date.getDate()}</span>
        {badge && <span className={`truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.tone}`}>{badge.label}</span>}
        <span className="flex-1" />
        {total > 1 && !day.past && <span className="text-[10px] text-muted tabular-nums">{filled.length}/{total}</span>}
      </p>
      {/* Slideshows still being made stay hidden: the day shows only "Making… 1:14 left" until they are ready. */}
      {shown.map((slot, i) => <SlotRow key={`${i}-${slot.at.toISOString()}`} slot={slot} size={big ? 'lg' : 'sm'} onOpen={actions.onOpen} />)}
      <DayAdd day={day} actions={actions} size={shown.length === 0 ? 'big' : 'inline'} />
    </div>
  );
}
