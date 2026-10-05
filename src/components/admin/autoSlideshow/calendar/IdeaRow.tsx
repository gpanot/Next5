'use client';

import { Check, X } from 'lucide-react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import { formatLabel } from '../ideas/ideaCards';
import { ideaCover } from '../ideas/ideaCover';
import { NO_LONG_PRESS_MENU, useDraggablePost } from './SlideshowDnd';
import { timeOf } from './slotBadge';

type Props = {
  idea: IdeaDto;
  /** ✓ / ✕ toggle: tapping the active one again brings the idea back. */
  onDecide: (idea: IdeaDto, status: 'kept' | 'discarded' | 'proposed') => void;
  /** Opens the idea in the ideas deck (to watch it). */
  onOpen: (idea: IdeaDto) => void;
  /** Kept ideas are being made into posts right now. */
  busy?: boolean;
};

const CHIP: Record<'proposed' | 'kept' | 'discarded' | 'failed', { label: string; tone: string }> = {
  proposed: { label: 'Idea', tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  kept: { label: 'Ready', tone: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' },
  failed: { label: 'Not made', tone: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  discarded: { label: 'Skipped', tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' },
};

const round = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90';

/** One idea on the chosen day: faded photo, time, Idea / Ready / Skipped, its first line, and ✕ / ✓. Keeping makes the
 *  post at once (one step): a kept one reads "Ready" with no ✓ while it is saved, and can be dragged to another day. */
export function IdeaRow({ idea, onDecide, onOpen, busy = false }: Props) {
  const status = idea.status === 'kept' || idea.status === 'discarded' ? idea.status : 'proposed';
  const skipped = status === 'discarded';
  const kept = status === 'kept';
  const making = idea.slideshow?.state === 'making';
  // Not busy but still kept: making it failed (or the page reloaded first). The day's "Try again" makes it.
  const chip = CHIP[kept && !busy ? 'failed' : status];
  const cover = ideaCover(idea);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggablePost('panel', 'idea', idea.id, cover?.url ?? null, status === 'kept' && !making && !busy, cover?.video);
  return (
    <li ref={setNodeRef} {...listeners} {...attributes} className={`${NO_LONG_PRESS_MENU} ${isDragging ? 'opacity-30' : ''} flex items-center gap-3 rounded-[14px] border border-line p-1.5 pr-2.5 dark:border-zinc-800 ${skipped ? 'bg-zinc-50 dark:bg-zinc-950' : 'bg-white dark:bg-zinc-900'}`}>
      <button type="button" onClick={() => onOpen(idea)} disabled={skipped || making} aria-label={`Watch: ${idea.hook}`} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[10px] bg-zinc-100 transition active:scale-95 disabled:cursor-default dark:bg-zinc-800">
        {cover && <span className={`absolute inset-0 ${status !== 'kept' ? 'opacity-55' : ''} ${making ? 'animate-pulse grayscale' : ''}`}><CoverMedia src={cover.url} video={cover.video} /></span>}
      </button>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
          {skipped ? 'Not posting' : timeOf(new Date(idea.plannedAt))}
          <span className={`inline-flex items-center gap-1 rounded-full px-[7px] py-0.5 text-[10px] font-extrabold ${chip.tone}`}>
            {chip.label}
          </span>
          <span className="font-medium text-muted">{formatLabel(idea)}</span>
        </span>
        <span className={`line-clamp-2 text-sm leading-snug font-bold ${skipped ? 'text-zinc-400 line-through' : 'text-ink dark:text-zinc-100'}`}>{idea.hook}</span>
      </span>
      {!(kept && busy) && <span className="flex gap-1.5">
        <button type="button" onClick={() => onDecide(idea, skipped ? 'proposed' : 'discarded')} aria-label={skipped ? 'Bring back' : 'Skip'} aria-pressed={skipped} className={`${round} ${skipped ? 'bg-zinc-600 text-white' : 'border-[1.5px] border-line bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
          <X aria-hidden className="h-4 w-4" strokeWidth={2.6} />
        </button>
        {!kept && <button type="button" onClick={() => onDecide(idea, 'kept')} disabled={making} aria-label="Keep" className={`${round} border-[1.5px] border-line bg-white text-blue-600 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-blue-400`}>
          <Check aria-hidden className="h-4 w-4" strokeWidth={2.8} />
        </button>}
      </span>}
    </li>
  );
}
