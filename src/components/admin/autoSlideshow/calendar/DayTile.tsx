'use client';

import { MAX_PER_DAY, type PlanDay, type PlanSlot } from './monthPlan';
import { SlotRow } from './SlotRow';
import { useDroppableDay } from './SlideshowDnd';

export type DayActions = {
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

/** A future day's add area: − N + once it has posts (or wants some), else "+ Add post". */
export function DayAdd({ day, actions, size }: { day: PlanDay; actions: DayActions; size: Size }) {
  if (day.past) return null;
  if (day.slots.length > 0) return <DayStepper day={day} actions={actions} big={size === 'big' && filledOf(day).length === 0} />;
  return <AddButton day={day} actions={actions} size={size} />;
}

/** Tablet and desktop: one month cell with its date, its posts, and "+ Add post" for empty slots. */
export function DayTile({ day, actions }: { day: PlanDay; actions: DayActions }) {
  const filled = filledOf(day);
  const empty = emptyOf(day);
  const total = filled.length + empty;
  const room = !day.past && (empty > 0 || day.slots.length === 0);
  const { setNodeRef, isOver } = useDroppableDay('tile', day.key, day.past);
  const muted = !day.inMonth || (day.past && filled.length === 0);
  return (
    <div ref={setNodeRef} className={`${isOver ? 'ring-2 ring-blue-600' : ''} flex min-h-36 flex-col gap-1 rounded-xl border p-2 transition ${room && filled.length === 0 ? 'border-dashed border-blue-200 bg-blue-50/30 dark:border-blue-900/60 dark:bg-blue-950/10' : 'border-line bg-white dark:border-zinc-800 dark:bg-zinc-900'} ${muted ? 'opacity-50' : ''}`}>
      <p className="flex items-center justify-between px-0.5">
        <span className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold ${day.today ? 'bg-blue-600 px-1.5 text-white' : 'text-ink dark:text-zinc-100'}`}>{day.date.getDate()}</span>
        {total > 1 && !day.past && <span className="text-[10px] text-muted tabular-nums">{filled.length}/{total}</span>}
      </p>
      {filled.map((slot, i) => <SlotRow key={`${i}-${slot.at.toISOString()}`} slot={slot} size={filled.length === 1 && empty === 0 ? 'lg' : 'sm'} onOpen={actions.onOpen} />)}
      <DayAdd day={day} actions={actions} size={filled.length === 0 ? 'big' : 'inline'} />
    </div>
  );
}
