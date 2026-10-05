'use client';

import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import type { PlanDay } from './monthPlan';
import { MakingCountdown } from './MakingCountdown';
import { useDroppableDay } from './SlideshowDnd';
import type { TileEntry, TileStatus } from './tileModel';

/** One dot per post, by status (the legend's colors). */
export const DOT: Record<TileStatus, string> = {
  idea: 'border-[1.5px] border-white bg-transparent',
  kept: 'bg-blue-400',
  making: 'bg-zinc-400',
  ready: 'bg-white',
  scheduled: 'bg-emerald-400',
  failed: 'bg-red-500',
};

type Props = { day: PlanDay; entries: TileEntry[]; focused: boolean; onOpen: () => void };

/** The first post is being made and has no photo yet: the tile shows a countdown instead of a grey box. */
export const countdownOf = (entries: TileEntry[]): string | null => {
  const top = entries[0];
  return top?.status === 'making' && !top.cover && top.makingSince ? top.makingSince : null;
};

const dayName = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** The first post's photo, with the next two stacked behind it (tilted). */
function Cover({ entries }: { entries: TileEntry[] }) {
  const [top, ...rest] = entries;
  if (!top) return null;
  return (
    <>
      {rest.slice(0, 2).map((e, k) => (
        <span key={e.id} aria-hidden className="absolute inset-0 overflow-hidden rounded-[13px] border-2 border-white bg-zinc-200 dark:border-zinc-900 dark:bg-zinc-800" style={{ zIndex: 1 - k, transform: `translate(${4 + k * 4}px, ${-4 - k * 4}px) rotate(${3 + k * 3}deg)` }}>
          {e.cover && <CoverMedia src={e.cover} video={e.coverIsVideo} />}
        </span>
      ))}
      <span className={`absolute inset-0 z-[2] overflow-hidden rounded-[13px] bg-zinc-100 dark:bg-zinc-800 ${top.status === 'idea' ? 'opacity-60' : ''} ${top.status === 'making' ? 'grayscale' : ''}`}>
        {top.cover && <CoverMedia src={top.cover} video={top.coverIsVideo} />}
      </span>
      {top.captionOnCover && (
        <span className="pointer-events-none absolute inset-x-1.5 top-[30%] z-[3] line-clamp-3 text-center text-[11px] leading-tight font-extrabold text-white [text-shadow:0_0_2px_#000,0_0_2px_#000]">{top.caption}</span>
      )}
    </>
  );
}

/** The tile's edge: blue ring on the day in focus, green when all is scheduled, dashed blue with an idea, else dark. */
const edgeOf = (entries: TileEntry[], focused: boolean, past: boolean) => {
  if (focused) return 'ring-[3px] ring-blue-600';
  // Past days with nothing on them stay blank, as in the canvas.
  if (entries.length === 0 && past) return 'border border-transparent';
  if (entries.length === 0) return 'border-[1.5px] border-dashed border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900';
  if (entries.some((e) => e.status === 'idea')) return 'border-[1.5px] border-dashed border-blue-600 dark:border-blue-400';
  if (entries.every((e) => e.status === 'scheduled')) return 'ring-2 ring-emerald-500';
  return 'ring-[1.5px] ring-zinc-900 dark:ring-zinc-100';
};

/**
 * Tablet and desktop: one day of the month, as in the canvas. The first post's photo (its first line on raw photos),
 * a stack and a count when there are more, one status dot per post. Tap: the day opens on the right.
 */
export function CanvasTile({ day, entries, focused, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppableDay('tile', day.key, day.past);
  const muted = !day.inMonth || (day.past && entries.length === 0);
  const countdown = countdownOf(entries);
  const label = `${dayName(day.date)}: ${entries.length} ${entries.length === 1 ? 'post' : 'posts'}`;
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      disabled={muted}
      aria-label={label}
      aria-pressed={focused}
      title={label}
      className={`relative block aspect-[4/5] w-full rounded-[14px] text-left transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-default disabled:hover:translate-y-0${muted ? 'opacity-40' : ''} ${isOver ? 'ring-[3px] ring-blue-600' : edgeOf(entries, focused, day.past || !day.inMonth)} ${entries.some((e) => e.status === 'making') && !countdown ? 'animate-pulse' : ''}`}
    >
      <Cover entries={entries} />
      {countdown && <MakingCountdown since={countdown} />}
      <span className={`absolute top-1.5 left-1.5 z-[3] rounded-full px-1.5 py-1 text-xs leading-none font-extrabold ${entries.length > 0 ? 'bg-zinc-900/55 text-white' : day.today ? 'bg-blue-600 text-white' : 'text-ink dark:text-zinc-100'}`}>{day.date.getDate()}</span>
      {entries.length > 1 && (
        <span className="absolute -top-2 -right-2 z-[4] flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-zinc-900 px-1 text-[11px] font-extrabold text-white dark:border-zinc-900 dark:bg-white dark:text-zinc-900">{entries.length}</span>
      )}
      {entries.length > 0 && (
        <span aria-hidden className="absolute bottom-1.5 left-1/2 z-[3] flex -translate-x-1/2 gap-[3px] rounded-full bg-zinc-900/60 px-[5px] py-[3px]">
          {entries.slice(0, 5).map((e) => <span key={e.id} className={`h-[9px] w-[9px] rounded-full ${DOT[e.status]}`} />)}
        </span>
      )}
      {entries.length === 0 && !day.past && day.inMonth && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          Add post
        </span>
      )}
    </button>
  );
}
