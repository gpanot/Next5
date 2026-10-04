'use client';

import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import { GOAL_LABELS } from '../../../../types/admin/contentGoals';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { compact } from '../posting/PostStats';
import { goalStyle } from './goalStyle';
import { blitzOpenable } from './monthPlan';
import { badgeOf, coverIsVideoOf, coverOf, timeOf, titleOf } from './slotBadge';
import { NO_LONG_PRESS_MENU, useDraggableShow, useSlideshowDrag } from './SlideshowDnd';
import type { Filled } from './tileModel';

/** One post of the chosen day: photo, goal, status, time, platforms and views. Tap: open it (edit, approve, or see it
 *  live); slideshows can be dragged to another day. */
export function PostRow({ slot, onOpen, onOpenBlitz }: { slot: Filled; onOpen: (id: string) => void; onOpenBlitz: (item: BlitzScheduleDto) => void }) {
  const { item } = slot;
  const badge = badgeOf(item);
  const cover = coverOf(item);
  const live = item.show?.posts.filter((p) => p.status !== 'canceled' && p.status !== 'failed') ?? [];
  const views = live.reduce((n, p) => n + (p.stats?.views ?? 0), 0);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggableShow('panel', item.show?.id, cover, item.kind === 'ready');
  const { justDropped } = useSlideshowDrag();
  // A Blitz video opens its approval until it starts, then its TikTok post once live.
  const link = item.kind === 'blitz' ? item.blitz.postUrl : null;
  const approvable = item.kind === 'blitz' && blitzOpenable(item.blitz);
  const open = () => {
    if (justDropped()) return;
    if (item.kind === 'blitz' && approvable) onOpenBlitz(item.blitz);
    else if (link) window.open(link, '_blank', 'noopener');
    else if (item.show && item.kind !== 'making') onOpen(item.show.id);
  };
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={open}
      disabled={!approvable && !link && (!item.show || item.kind === 'making')}
      aria-label={`${titleOf(item)} · ${badge.label} · ${timeOf(slot.at)}`}
      className={`${NO_LONG_PRESS_MENU} ${isDragging ? 'opacity-30' : ''} flex min-h-20 w-full items-center gap-3 rounded-[14px] border border-line bg-white p-1.5 pr-2.5 text-left transition active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900`}
    >
      <span className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 ${item.kind === 'making' ? 'animate-pulse' : ''}`}>
        {cover && <CoverMedia src={cover} video={coverIsVideoOf(item)} />}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{timeOf(slot.at)}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span>
          {item.show?.goal && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${goalStyle(item.show.goal).pill}`}>{GOAL_LABELS[item.show.goal]}</span>}
        </span>
        <span className="line-clamp-2 block text-sm leading-snug font-bold text-ink dark:text-zinc-100">{item.kind === 'blitz' ? item.blitz.title : item.show?.slides[0]?.title || titleOf(item)}</span>
        {item.kind === 'blitz' && (
          <span className={`flex items-center gap-1 text-[11px] ${item.blitz.error ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}>
            <PlatformIcon id="tiktok" className="h-3 w-3" />
            {item.blitz.error ?? (item.blitz.status === 'planned' ? 'Video · tap to approve' : 'Video · made 1 hour before it posts')}
          </span>
        )}
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
