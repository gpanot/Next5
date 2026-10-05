'use client';

import { formatElapsed, useNow } from '../../shared/runClock';

/** A slideshow usually takes about three minutes to make. */
export const TYPICAL_MAKE_MS = 180_000;

/** Three slides fanning in and out, one after the other: the slideshow being put together. */
function Shuffle({ small }: { small: boolean }) {
  const size = small ? 'h-3 w-2.5' : 'h-7 w-[22px]';
  return (
    <span aria-hidden className={`relative flex items-end justify-center ${small ? 'h-4 w-6' : 'h-9 w-14'}`}>
      {[-1, 0, 1].map((k) => (
        <span
          key={k}
          className={`absolute bottom-0 ${size} animate-[making-fan_1.8s_ease-in-out_infinite] rounded-[3px] border border-white bg-zinc-300 shadow-sm dark:border-zinc-700 dark:bg-zinc-600`}
          style={{ animationDelay: `${(k + 1) * 0.2}s`, ['--fan' as string]: `${k * 14}deg`, ['--shift' as string]: `${k * (small ? 5 : 12)}px` }}
        />
      ))}
      <style>{'@keyframes making-fan{0%,100%{transform:translateX(0) rotate(0)}50%{transform:translateX(var(--shift)) rotate(var(--fan))}}'}</style>
    </span>
  );
}

/**
 * On a tile whose slideshow is being made: a small animation and a "3:00" countdown from when the work began, so the
 * wait never looks stuck. `small`: the phone's month cell (no words, just the clock).
 */
export function MakingCountdown({ since, small = false }: { since: string; small?: boolean }) {
  const now = useNow(true);
  const left = TYPICAL_MAKE_MS - (now - new Date(since).getTime());
  const late = left <= 0;
  return (
    <span className={`absolute inset-0 z-[3] flex flex-col items-center justify-center ${small ? 'gap-0.5 pt-2' : 'gap-2'}`} aria-live="off">
      <Shuffle small={small} />
      <span className={`tabular-nums font-extrabold text-ink dark:text-zinc-100 ${small ? 'text-[9px]' : 'text-base'}`}>{late ? (small ? '…' : 'Almost done') : formatElapsed(left).replace(/^0/, '')}</span>
      {!small && <span className="text-[11px] font-semibold text-muted">Making your slideshow</span>}
    </span>
  );
}
