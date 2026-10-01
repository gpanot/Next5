'use client';

import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { compact } from '../posting/PostStats';
import type { PlanDay, PlanSlot } from './monthPlan';
import { DayAdd, type DayActions } from './DayTile';
import { GOAL_LABELS } from '../../../../types/admin/contentGoals';
import { goalStyle } from './goalStyle';
import { badgeOf, coverOf, timeOf, titleOf } from './slotBadge';
import { NO_LONG_PRESS_MENU, useDraggableShow, useSlideshowDrag } from './SlideshowDnd';

type Filled = PlanSlot & { item: NonNullable<PlanSlot['item']> };

/** One post of the chosen day: big photo, topic, time, status, platforms and views. */
function PanelRow({ slot, onOpen }: { slot: Filled; onOpen: (id: string) => void }) {
  const { item } = slot;
  const badge = badgeOf(item);
  const cover = coverOf(item);
  const live = item.show?.posts.filter((p) => p.status !== 'canceled' && p.status !== 'failed') ?? [];
  const views = live.reduce((n, p) => n + (p.stats?.views ?? 0), 0);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggableShow('panel', item.show?.id, cover, item.kind === 'ready');
  const { justDropped } = useSlideshowDrag();
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !justDropped() && item.show && item.kind !== 'making' && onOpen(item.show.id)}
      disabled={!item.show || item.kind === 'making'}
      className={`${NO_LONG_PRESS_MENU} ${isDragging ? 'opacity-30' : ''} flex min-h-20 w-full items-center gap-3 rounded-xl border border-line bg-white p-2 text-left transition active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900`}
    >
      <span className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 ${item.kind === 'making' ? 'animate-pulse' : ''}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-1.5">
          {item.show?.goal && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${goalStyle(item.show.goal).pill}`}>{GOAL_LABELS[item.show.goal]}</span>}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span>
          <span className="text-xs text-muted">{timeOf(slot.at)}</span>
        </span>
        <span className="line-clamp-2 block text-sm font-semibold text-ink dark:text-zinc-100">{titleOf(item)}</span>
        {live.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted">
            {live.map((p) => <PlatformIcon key={p.platform} id={p.platform} className="h-3 w-3" />)}
            {views > 0 && <span className="tabular-nums">{compact(views)} views</span>}
          </span>
        )}
      </span>
    </button>
  );
}

/** Phone: the day tapped in the month grid, as a list. */
export function DayPanel({ day, actions }: { day: PlanDay; actions: DayActions }) {
  const filled = day.slots.filter((s): s is Filled => s.item !== null);
  return (
    <div className="space-y-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
      <p className="text-sm font-bold text-ink dark:text-zinc-100">{day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      {filled.filter((s) => s.item.kind !== 'making').map((slot, i) => <PanelRow key={`${i}-${slot.at.toISOString()}`} slot={slot} onOpen={actions.onOpen} />)}
      {filled.length === 0 && day.past && <p className="py-2 text-sm text-muted">Nothing posted this day.</p>}
      {!day.past && <div className="rounded-xl border border-dashed border-blue-200 bg-white p-1 dark:border-blue-900/60 dark:bg-zinc-900"><DayAdd day={day} actions={actions} size="touch" /></div>}
    </div>
  );
}
