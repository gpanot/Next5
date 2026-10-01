'use client';

import type { PlanSlot } from './monthPlan';
import { goalStyle } from './goalStyle';
import { NO_LONG_PRESS_MENU, useDraggableShow, useSlideshowDrag } from './SlideshowDnd';
import { badgeOf, coverOf, timeOf, titleOf } from './slotBadge';

type Props = { slot: PlanSlot & { item: NonNullable<PlanSlot['item']> }; size: 'lg' | 'sm'; onOpen: (slideshowId: string) => void };

/** One filled slot. `lg` (a day with one post): a big photo with the goal color on its left edge; the status pill sits
 *  by the date. `sm` (a day with several): a row with a small photo, the topic and the status pill. */
export function SlotRow({ slot, size, onOpen }: Props) {
  const { item } = slot;
  const badge = badgeOf(item);
  const cover = coverOf(item);
  const show = item.show;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggableShow('tile', show?.id, cover, item.kind === 'ready');
  const { justDropped } = useSlideshowDrag();
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !justDropped() && show && item.kind !== 'making' && onOpen(show.id)}
      disabled={!show || item.kind === 'making'}
      aria-label={`${titleOf(item)} · ${badge.label} · ${timeOf(slot.at)}`}
      className={`${size === 'lg' ? 'block' : 'flex items-center gap-2 py-0.5 pr-0.5 pl-1.5'} w-full min-w-0 rounded-lg border-l-[3px] text-left ${NO_LONG_PRESS_MENU} ${isDragging ? 'opacity-30' : ''} ${item.kind === 'ready' ? 'cursor-grab' : ''} ${goalStyle(show?.goal).border} transition active:scale-[0.98] ${size === 'sm' ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60' : 'hover:opacity-90'} disabled:cursor-default`}
    >
      <span className={`${size === 'lg' ? 'block aspect-[4/5] w-full rounded-r-lg' : 'h-7 w-6 rounded-md'} relative shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${item.kind === 'making' ? 'animate-pulse' : ''}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </span>
      {size === 'sm' && <span className="min-w-0 flex-1 truncate text-[11px] text-ink dark:text-zinc-100">{titleOf(item)}</span>}
      {size === 'sm' && <span className={`shrink-0 rounded-full px-1 py-px text-[9px] font-semibold ${badge.tone}`}>{badge.short}</span>}
    </button>
  );
}
