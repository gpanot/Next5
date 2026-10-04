'use client';

import { Check, X } from 'lucide-react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import { formatLabel } from '../ideas/ideaCards';
import { timeOf } from './slotBadge';

type Props = {
  idea: IdeaDto;
  /** ✓ / ✕ toggle: tapping the active one again brings the idea back. */
  onDecide: (idea: IdeaDto, status: 'kept' | 'discarded' | 'proposed') => void;
  /** Opens the idea in the ideas deck (to watch it). */
  onOpen: (idea: IdeaDto) => void;
};

const CHIP: Record<'proposed' | 'kept' | 'discarded', { label: string; tone: string }> = {
  proposed: { label: 'Idea', tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  kept: { label: 'Kept', tone: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  discarded: { label: 'Skipped', tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' },
};

const round = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90';

/** One idea on the chosen day: faded photo, time, Idea / Kept / Skipped, its first line, and ✕ / ✓. */
export function IdeaRow({ idea, onDecide, onOpen }: Props) {
  const status = idea.status === 'kept' || idea.status === 'discarded' ? idea.status : 'proposed';
  const skipped = status === 'discarded';
  const making = idea.slideshow?.state === 'making';
  return (
    <li className={`flex items-center gap-3 rounded-[14px] border border-line p-1.5 pr-2.5 dark:border-zinc-800 ${skipped ? 'bg-zinc-50 dark:bg-zinc-950' : 'bg-white dark:bg-zinc-900'}`}>
      <button type="button" onClick={() => onOpen(idea)} disabled={skipped || making} aria-label={`Watch: ${idea.hook}`} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[10px] bg-zinc-100 transition active:scale-95 disabled:cursor-default dark:bg-zinc-800">
        {idea.coverUrl && <span className={`absolute inset-0 ${status !== 'kept' ? 'opacity-55' : ''} ${making ? 'animate-pulse grayscale' : ''}`}><CoverMedia src={idea.coverUrl} /></span>}
      </button>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
          {skipped ? 'Not posting' : timeOf(new Date(idea.plannedAt))}
          <span className={`rounded-full px-[7px] py-0.5 text-[10px] font-extrabold ${CHIP[status].tone}`}>{CHIP[status].label}</span>
          <span className="font-medium text-muted">{making ? 'Slideshow · being made' : formatLabel(idea)}</span>
        </span>
        <span className={`line-clamp-2 text-sm leading-snug font-bold ${skipped ? 'text-zinc-400 line-through' : 'text-ink dark:text-zinc-100'}`}>{idea.hook}</span>
      </span>
      <span className="flex gap-1.5">
        <button type="button" onClick={() => onDecide(idea, skipped ? 'proposed' : 'discarded')} aria-label={skipped ? 'Bring back' : 'Skip'} aria-pressed={skipped} className={`${round} ${skipped ? 'bg-zinc-600 text-white' : 'border-[1.5px] border-line bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
          <X aria-hidden className="h-4 w-4" strokeWidth={2.6} />
        </button>
        <button type="button" onClick={() => onDecide(idea, status === 'kept' ? 'proposed' : 'kept')} disabled={making} aria-label={status === 'kept' ? 'Unkeep' : 'Keep'} aria-pressed={status === 'kept'} className={`${round} disabled:opacity-30 ${status === 'kept' ? 'bg-blue-600 text-white' : 'border-[1.5px] border-line bg-white text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-blue-400'}`}>
          <Check aria-hidden className="h-4 w-4" strokeWidth={2.8} />
        </button>
      </span>
    </li>
  );
}
