'use client';

import type { PlanSlot } from './monthPlan';
import { goalStyle } from './goalStyle';
import { NO_LONG_PRESS_MENU, useDraggableShow, useSlideshowDrag } from './SlideshowDnd';
import { badgeOf, coverOf, timeOf, titleOf } from './slotBadge';

/** Marks a Blitz video (the others are photo slideshows). */
function VideoMark({ big }: { big: boolean }) {
  return (
    <span aria-hidden className={`absolute flex items-center justify-center rounded-full bg-black/60 text-white ${big ? 'right-1.5 bottom-1.5 h-6 w-6' : 'inset-0 m-auto h-3.5 w-3.5'}`}>
      <svg viewBox="0 0 10 10" className={big ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5'} fill="currentColor"><path d="M2.5 1.5v7l6-3.5z" /></svg>
    </span>
  );
}

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
  // A Blitz video opens its TikTok post once live; until then it is shown only (change it from the Content page).
  const link = item.kind === 'blitz' ? item.blitz.postUrl : null;
  const open = () => {
    if (justDropped()) return;
    if (link) window.open(link, '_blank', 'noopener');
    else if (show && item.kind !== 'making') onOpen(show.id);
  };
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={open}
      disabled={!link && (!show || item.kind === 'making')}
      title={item.kind === 'blitz' && item.blitz.error ? item.blitz.error : undefined}
      aria-label={`${titleOf(item)} · ${badge.label} · ${timeOf(slot.at)}`}
      className={`${size === 'lg' ? 'block' : 'flex items-center gap-2 py-0.5 pr-0.5 pl-1.5'} w-full min-w-0 rounded-lg border-l-[3px] text-left ${NO_LONG_PRESS_MENU} ${isDragging ? 'opacity-30' : ''} ${item.kind === 'ready' ? 'cursor-grab' : ''} ${goalStyle(show?.goal).border} transition active:scale-[0.98] ${size === 'sm' ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60' : 'hover:opacity-90'} disabled:cursor-default`}
    >
      <span className={`${size === 'lg' ? 'block aspect-[4/5] w-full rounded-r-lg' : 'h-7 w-6 rounded-md'} relative shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${item.kind === 'making' ? 'animate-pulse' : ''}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        {item.kind === 'blitz' && <VideoMark big={size === 'lg'} />}
      </span>
      {size === 'sm' && <span className="min-w-0 flex-1 truncate text-[11px] text-ink dark:text-zinc-100">{titleOf(item)}</span>}
      {size === 'sm' && <span className={`shrink-0 rounded-full px-1 py-px text-[9px] font-semibold ${badge.tone}`}>{badge.short}</span>}
    </button>
  );
}
