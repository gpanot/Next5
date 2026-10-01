'use client';

import type { MonthCounts } from './monthPlan';

type Props = { month: Date; counts: MonthCounts; canPrev: boolean; canNext: boolean; onMonth: (step: -1 | 1) => void };

function Arrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir < 0 ? 'Previous month' : 'Next month'} className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-zinc-100 active:scale-90 disabled:opacity-30 dark:text-zinc-100 dark:hover:bg-zinc-800">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
      </svg>
    </button>
  );
}

const CHIPS: { key: keyof MonthCounts; label: string }[] = [
  { key: 'ready', label: 'ready to post' },
  { key: 'scheduled', label: 'scheduled' },
  { key: 'posted', label: 'posted' },
  { key: 'empty', label: 'empty' },
];

/** "‹ October 2026 ›" and the month's counts: ready, scheduled, posted, empty. */
export function MonthHeader({ month, counts, canPrev, canNext, onMonth }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center rounded-full border border-line dark:border-zinc-800">
        <Arrow dir={-1} disabled={!canPrev} onClick={() => onMonth(-1)} />
        <span className="min-w-36 text-center text-base font-bold text-ink dark:text-zinc-100" aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <Arrow dir={1} disabled={!canNext} onClick={() => onMonth(1)} />
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {CHIPS.filter((c) => c.key !== 'posted' || counts.posted > 0).map((c) => (
          <li key={c.key} className="flex items-center gap-1">
            <span className="font-bold text-ink tabular-nums dark:text-zinc-100">{counts[c.key]}</span> {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
