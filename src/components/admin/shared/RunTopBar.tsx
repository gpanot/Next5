'use client';

import type { ReactNode } from 'react';

type Props = { onBack?: () => void; children?: ReactNode; stickyTop?: string };

/** Page top bar during a run: back link (when `onBack` is given) and step progress on one row, pinned while the page scrolls.
 *  Negative margins cancel the parent's padding so the bar spans the full width.
 *  `stickyTop` offsets the pin when another sticky bar sits above (e.g. "top-16"). */
export function RunTopBar({ onBack, children, stickyTop = 'top-0' }: Props) {
  return (
    <div className={`sticky ${stickyTop} z-30 -mx-4 -mt-4 mb-6 border-b border-line/60 bg-white/80 backdrop-blur-md md:-mx-8 md:-mt-8 md:mb-8 dark:border-zinc-800/60 dark:bg-zinc-950/80`}>
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center gap-3 px-4 py-2 md:gap-6 md:px-8">
        {onBack && (
          <button onClick={onBack} aria-label="New run" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full text-sm font-medium text-muted transition hover:text-ink dark:text-zinc-400 dark:hover:text-zinc-100">
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">New run</span>
          </button>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
