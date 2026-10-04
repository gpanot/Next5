'use client';

import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import { DOT } from './CanvasTile';
import type { PlanDay } from './monthPlan';
import { useDroppableDay } from './SlideshowDnd';
import type { TileEntry } from './tileModel';

/** `focused`: the day of the idea in focus in the ideas deck. */
type Props = { day: PlanDay; entries: TileEntry[]; selected: boolean; focused?: boolean; onSelect: () => void };

/** Phone: one small month cell. The first post's photo fills it (faded for an idea), one status dot per post. Tap to
 *  see the day below. */
export function MiniDay({ day, entries, selected, focused = false, onSelect }: Props) {
  const top = entries[0];
  const { setNodeRef, isOver } = useDroppableDay('mini', day.key, day.past);
  const idea = entries.some((e) => e.status === 'idea');
  const label = `${day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${entries.length} ${entries.length === 1 ? 'post' : 'posts'}`;
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-lg border transition active:scale-95 ${selected || isOver || focused ? 'border-blue-600 ring-2 ring-blue-600' : idea ? 'border-dashed border-blue-600 dark:border-blue-400' : !day.past && entries.length === 0 ? 'border-dashed border-zinc-300 dark:border-zinc-700' : 'border-line dark:border-zinc-800'} ${!day.inMonth ? 'opacity-40' : ''} ${top?.status === 'making' ? 'animate-pulse bg-zinc-100 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'}`}
    >
      {top?.cover && <span className={`absolute inset-0 ${top.status === 'idea' || day.past ? 'opacity-60' : ''}`}><CoverMedia src={top.cover} video={top.coverIsVideo} /></span>}
      <span className={`absolute top-0.5 left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${day.today ? 'bg-blue-600 text-white' : top?.cover ? 'bg-black/50 text-white' : 'text-ink dark:text-zinc-100'}`}>{day.date.getDate()}</span>
      {entries.length > 0 && (
        <span aria-hidden className="absolute inset-x-0 bottom-0.5 flex justify-center">
          <span className="flex gap-0.5 rounded-full bg-zinc-900/60 px-1 py-0.5">{entries.slice(0, 5).map((e) => <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${DOT[e.status]}`} />)}</span>
        </span>
      )}
      {!top?.cover && !day.past && entries.length === 0 && <span aria-hidden className="absolute inset-0 flex items-center justify-center pt-2 text-sm text-zinc-400">+</span>}
    </button>
  );
}
