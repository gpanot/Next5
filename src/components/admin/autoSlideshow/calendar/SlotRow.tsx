'use client';

import type { PlanSlot } from './monthPlan';
import { goalStyle } from './goalStyle';
import { NO_LONG_PRESS_MENU, useDraggableShow, useSlideshowDrag } from './SlideshowDnd';
import { badgeOf, coverOf, timeOf, titleOf } from './slotBadge';

type Props = { slot: PlanSlot & { item: NonNullable<PlanSlot['item']> }; size: 'lg' | 'sm'; onOpen: (slideshowId: string) => void };

/** One filled slot: goal color stripe, photo, topic and status pill. `lg` on a day with one post, `sm` when a day holds several. */
export function SlotRow({ slot, size, onOpen }: Props) {
  const { item } = slot;
  const badge = badgeOf(item);
  const cover = coverOf(item);
  const show = item.show;
  const thumb = size === 'lg' ? 'h-14 w-11' : 'h-7 w-6';
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
      className={`flex w-full min-w-0 items-center gap-2 rounded-lg border-l-[3px] py-0.5 pr-0.5 pl-1.5 text-left ${NO_LONG_PRESS_MENU} ${isDragging ? 'opacity-30' : ''} ${item.kind === 'ready' ? 'cursor-grab' : ''} ${goalStyle(show?.goal).border} transition hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-default dark:hover:bg-zinc-800/60`}
    >
      <span className={`${thumb} relative shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 ${item.kind === 'making' ? 'animate-pulse' : ''}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        {size === 'lg' && <span className={`mb-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-semibold ${badge.tone}`}>{badge.label}</span>}
        <span className={`block text-ink dark:text-zinc-100 ${size === 'lg' ? 'line-clamp-2 text-xs font-semibold' : 'truncate text-[11px]'}`}>{titleOf(item)}</span>
      </span>
      {size === 'sm' && <span className={`shrink-0 rounded-full px-1 py-px text-[9px] font-semibold ${badge.tone}`}>{badge.short}</span>}
    </button>
  );
}
