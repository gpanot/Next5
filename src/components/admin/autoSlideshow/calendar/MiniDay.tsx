'use client';

import type { PlanDay } from './monthPlan';
import { goalStyle } from './goalStyle';
import { coverOf } from './slotBadge';
import { useDroppableDay } from './SlideshowDnd';
import { emptyOf } from './DayTile';

type Props = { day: PlanDay; selected: boolean; onSelect: () => void };

/** Phone: one small month cell. The first post's photo fills it, one goal-colored dot per post. Tap to see the day below. */
export function MiniDay({ day, selected, onSelect }: Props) {
  const items = day.slots.flatMap((s) => (s.item ? [s.item] : []));
  const cover = items[0] ? coverOf(items[0]) : null;
  const empty = emptyOf(day);
  const { setNodeRef, isOver } = useDroppableDay('mini', day.key, day.past);
  const label = `${day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${items.length} ${items.length === 1 ? 'post' : 'posts'}${empty ? `, ${empty} empty` : ''}`;
  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-lg border transition active:scale-95 ${selected || isOver ? 'border-blue-600 ring-2 ring-blue-600' : !day.past && items.length === 0 ? 'border-dashed border-blue-200 dark:border-blue-900/60' : 'border-line dark:border-zinc-800'} ${!day.inMonth ? 'opacity-40' : ''} ${items[0]?.kind === 'making' ? 'animate-pulse bg-zinc-100 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'}`}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover ${day.past ? 'opacity-60' : ''}`} />
      )}
      <span className={`absolute top-0.5 left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${day.today ? 'bg-blue-600 text-white' : cover ? 'bg-black/50 text-white' : 'text-ink dark:text-zinc-100'}`}>{day.date.getDate()}</span>
      {items.length > 0 && (
        <span aria-hidden className="absolute inset-x-0 bottom-0.5 flex justify-center gap-0.5">
          {items.map((item, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ring-1 ring-white dark:ring-zinc-900 ${goalStyle(item.show?.goal).dot}`} />)}
        </span>
      )}
      {!cover && !day.past && (items.length === 0 || empty > 0) && <span aria-hidden className="absolute inset-0 flex items-center justify-center pt-2 text-sm text-blue-500">+</span>}
    </button>
  );
}
