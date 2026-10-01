'use client';

import type { PlanDay, PlanSlot } from './monthPlan';
import { SlotRow } from './SlotRow';
import { useDroppableDay } from './SlideshowDnd';
import { MAX_PER_DAY } from './usePostTime';

export type DayActions = {
  perDay: number;
  /** Day key the plan starts on (days from it show the − N + stepper), or null with no plan. */
  planStart: string | null;
  /** "Add post" on a day: the plan starts there, at the current posts a day. */
  onStart: (key: string) => void;
  /** Posts a day for every planned day; 0 removes the plan. */
  onPerDay: (n: number) => void;
  onOpen: (slideshowId: string) => void;
};

type Filled = PlanSlot & { item: NonNullable<PlanSlot['item']> };
const filledOf = (day: PlanDay) => day.slots.filter((s): s is Filled => s.item !== null);
export const emptyOf = (day: PlanDay) => (day.past ? 0 : day.slots.length - filledOf(day).length);

type Size = 'inline' | 'big' | 'touch';

/** "+ Add post": the plan starts on this day. Nothing is made until "Generate". */
function AddButton({ day, actions, size }: { day: PlanDay; actions: DayActions; size: Size }) {
  const big = size === 'big';
  return (
    <button
      onClick={() => actions.onStart(day.key)}
      className={`flex w-full items-center justify-center gap-1 rounded-lg font-semibold text-blue-600 transition hover:bg-blue-50 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-950 ${big ? 'min-h-11 flex-1 flex-col text-xs' : size === 'touch' ? 'min-h-12 text-sm' : 'min-h-8 text-[11px]'}`}
    >
      <span aria-hidden className={big ? 'flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 text-lg dark:border-blue-900' : ''}>+</span>
      Add post
    </button>
  );
}

const round = 'flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-semibold text-blue-600 transition active:scale-90 disabled:opacity-30 dark:border-blue-900 dark:bg-zinc-900 dark:text-blue-400';

/** "− N +": posts a day, 1 to 5, for every planned day at once. − at 1 removes the plan. */
function PerDayStepper({ actions, big }: { actions: DayActions; big: boolean }) {
  const { perDay, onPerDay } = actions;
  return (
    <div className={`flex flex-col items-center justify-center gap-1 ${big ? 'flex-1' : 'py-1'}`}>
      <div className="flex items-center gap-1.5" role="group" aria-label="Posts a day">
        <button onClick={() => onPerDay(perDay - 1)} aria-label={perDay === 1 ? 'Remove the plan' : 'One less post a day'} className={round}>−</button>
        <span className="w-5 text-center text-lg font-extrabold text-ink tabular-nums dark:text-zinc-100" aria-live="polite">{perDay}</span>
        <button onClick={() => onPerDay(perDay + 1)} disabled={perDay >= MAX_PER_DAY} aria-label="One more post a day" className={round}>+</button>
      </div>
      <span className="text-center text-[10px] leading-tight text-muted">{perDay === 1 ? 'post' : 'posts'} a day, every day</span>
    </div>
  );
}

/** A day's add area: the stepper on planned days with room left, else "+ Add post" on days with room. */
export function DayAdd({ day, actions, size }: { day: PlanDay; actions: DayActions; size: Size }) {
  if (day.past) return null;
  const planned = actions.planStart !== null && day.key >= actions.planStart;
  if (planned) return emptyOf(day) > 0 ? <PerDayStepper actions={actions} big={size === 'big'} /> : null;
  return filledOf(day).length < actions.perDay ? <AddButton day={day} actions={actions} size={size} /> : null;
}

/** Tablet and desktop: one month cell with its date, its posts, and "+ Add post" for empty slots. */
export function DayTile({ day, actions }: { day: PlanDay; actions: DayActions }) {
  const filled = filledOf(day);
  const empty = emptyOf(day);
  const total = filled.length + empty;
  const room = !day.past && (empty > 0 || filled.length < actions.perDay);
  const { setNodeRef, isOver } = useDroppableDay('tile', day.key, day.past);
  const muted = !day.inMonth || (day.past && filled.length === 0);
  return (
    <div ref={setNodeRef} className={`${isOver ? 'ring-2 ring-blue-600' : ''} flex min-h-36 flex-col gap-1 rounded-xl border p-2 transition ${room && filled.length === 0 ? 'border-dashed border-blue-200 bg-blue-50/30 dark:border-blue-900/60 dark:bg-blue-950/10' : 'border-line bg-white dark:border-zinc-800 dark:bg-zinc-900'} ${muted ? 'opacity-50' : ''}`}>
      <p className="flex items-center justify-between px-0.5">
        <span className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold ${day.today ? 'bg-blue-600 px-1.5 text-white' : 'text-ink dark:text-zinc-100'}`}>{day.date.getDate()}</span>
        {actions.perDay > 1 && !day.past && <span className="text-[10px] text-muted tabular-nums">{filled.length}/{total}</span>}
      </p>
      {filled.map((slot, i) => <SlotRow key={`${i}-${slot.at.toISOString()}`} slot={slot} size={filled.length === 1 && empty === 0 ? 'lg' : 'sm'} onOpen={actions.onOpen} />)}
      <DayAdd day={day} actions={actions} size={filled.length === 0 ? 'big' : 'inline'} />
    </div>
  );
}
