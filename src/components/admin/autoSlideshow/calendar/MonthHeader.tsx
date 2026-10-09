'use client';

import type { ReactNode } from 'react';
import type { MonthCounts } from './monthPlan';

type Props = { month: Date; canPrev: boolean; canNext: boolean; onMonth: (step: -1 | 1) => void };

function Arrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir < 0 ? 'Previous month' : 'Next month'} className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-zinc-100 active:scale-90 disabled:opacity-30 dark:text-zinc-100 dark:hover:bg-zinc-800">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
      </svg>
    </button>
  );
}

/** `subtitleOnPhone` false: the line only shows from md up. */
type HeaderProps = Props & { subtitle?: string; subtitleOnPhone?: boolean; children?: ReactNode };

/** As in the canvas: "October 2026" (arrows change the month), one line about it, and the legend on the right. */
export function MonthHeader({ month, canPrev, canNext, onMonth, subtitle, subtitleOnPhone = true, children }: HeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-1">
        <Arrow dir={-1} disabled={!canPrev} onClick={() => onMonth(-1)} />
        <div>
          <h2 className="text-3xl font-heading font-normal text-ink dark:text-zinc-100" aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          {subtitle && <p className={`text-[13px] text-muted ${subtitleOnPhone ? '' : 'hidden md:block'}`}>{subtitle}</p>}
        </div>
        <Arrow dir={1} disabled={!canNext} onClick={() => onMonth(1)} />
      </div>
      {children}
    </div>
  );
}

/** "3 ready to post · 2 scheduled · 4 empty": the month's posts in a few words. */
export const countsLine = (counts: MonthCounts): string =>
  [
    counts.ready > 0 && `${counts.ready} ready to post`,
    counts.scheduled > 0 && `${counts.scheduled} scheduled`,
    counts.posted > 0 && `${counts.posted} posted`,
    counts.empty > 0 && `${counts.empty} empty`,
  ].filter(Boolean).join(' · ');
