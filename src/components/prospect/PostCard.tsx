'use client';

import type { ProspectViewDay } from '../../types/admin/prospects';
import { chipDay } from './postLabels';

export const PlayIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}><path d="M6 4l14 8-14 8z" /></svg>
);

export const LockIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/** The hook line on the still, the way the video shows it. */
const HookLine = ({ text }: { text: string }) => (
  <p className="absolute inset-x-2.5 top-[34%] m-0 font-display text-[16px] font-[800] leading-[1.28] text-white">
    <span className="rounded bg-black px-1.5 py-0.5 [box-decoration-break:clone]">{text}</span>
  </p>
);

/** The post's still: the slideshow's first slide, or the video's first frame (the first Blitz shot is often a clip).
 *  A locked video is only its first shot, so its hook line goes on top. */
export function Thumb({ day }: { day: ProspectViewDay }) {
  const hook = day.locked && day.kind === 'blitz' && day.title ? <HookLine text={day.title} /> : null;
  if (day.videoUrl) {
    return (
      <>
        <video src={`${day.videoUrl}#t=0.5`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        {hook}
      </>
    );
  }
  if (day.slides[0]) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 links that expire */}
        <img src={day.slides[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {hook}
      </>
    );
  }
  // No media: the hook on Next5's color, as a styled placeholder.
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-app-accent to-zinc-900">
      <HookLine text={day.title} />
    </div>
  );
}

/** A 9:16 post: its still, a play mark on videos, and "Yours when you claim" at the bottom
 *  ("After you buy" on a locked day). `showState` false for the copies in the post sheet and the compare section. */
export function PostFrame({ day, showState = true, extra }: { day: ProspectViewDay; showState?: boolean; extra?: React.ReactNode }) {
  return (
    <>
      <Thumb day={day} />
      {day.kind === 'blitz' && !day.locked && (
        <span className="absolute left-1/2 top-[62%] grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 pl-0.5 text-black shadow-sm">
          <PlayIcon />
        </span>
      )}
      {extra}
      {showState && (
        <>
          <span className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/75 to-transparent" aria-hidden />
          <span className="absolute inset-x-2.5 bottom-2.5 z-[1] flex items-center gap-1.5 text-[12px] font-semibold text-white">
            <LockIcon />
            {day.locked ? 'After you buy' : 'Yours when you claim'}
          </span>
        </>
      )}
    </>
  );
}

/** A tappable post in the strip. */
export function PostCard({ day, onOpen }: { day: ProspectViewDay; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${chipDay(day.at)}: ${day.title}`}
      className="relative block aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-[18px] bg-zinc-900 p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <PostFrame day={day} />
    </button>
  );
}
