'use client';

import { useState } from 'react';
import { adminFetch } from '../business/useAdminApi';

const WEEK = 7;

/** What's left to fill this week (a full week once one is complete), and the batch sizes offered: 1, 2 and that. */
export const weekPlan = (made: number) => {
  const left = WEEK - (made % WEEK);
  return { left, options: [...new Set([1, 2, left])].sort((a, b) => a - b) };
};

type Props = {
  token: string;
  /** POST { count } here to add that many to the run. */
  endpoint: string;
  /** How many the run has made so far (ready ones). */
  made: number;
  /** Singular noun, e.g. "ad" or "slideshow". */
  noun: string;
  /** Called once the run accepted the batch, so the page polls it again. */
  onStarted: () => void;
};

function WeekDots({ made }: { made: number }) {
  const filled = made % WEEK === 0 && made > 0 ? WEEK : made % WEEK;
  return (
    <div aria-hidden className="flex gap-1.5">
      {Array.from({ length: WEEK }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < filled ? 'bg-emerald-500' : 'border-2 border-dashed border-zinc-300 dark:border-zinc-600'}`} />
      ))}
    </div>
  );
}

/** Empty slot at the end of the grid: one tap fills the rest of the week (or just 1 or 2 more) in the same run. */
export function MoreCard({ token, endpoint, made, noun, onStarted }: Props) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { left, options } = weekPlan(made);

  const start = async (count: number) => {
    setBusy(count);
    setError(null);
    try {
      await adminFetch(token, endpoint, { method: 'POST', body: JSON.stringify({ count }) });
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
    }
    setBusy(null);
  };

  return (
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-3 text-center transition hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/20 dark:hover:border-blue-700">
      <WeekDots made={made} />
      <p className="text-sm leading-tight font-bold text-ink dark:text-zinc-100">
        Get {left} more
        <br />
        <span className="font-semibold text-blue-600 dark:text-blue-400">and complete your week</span>
      </p>
      <button
        onClick={() => void start(left)}
        disabled={busy !== null}
        className="min-h-11 w-full rounded-full bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {busy === left ? 'Starting…' : `+${left} ${noun}s →`}
      </button>
      <div className="flex items-center gap-1.5 text-[11px] text-muted dark:text-zinc-400">
        <span>or</span>
        {options.filter((n) => n !== left).map((n) => (
          <button
            key={n}
            onClick={() => void start(n)}
            disabled={busy !== null}
            className="min-h-9 min-w-9 rounded-full border border-line bg-white px-2.5 font-semibold text-ink transition hover:border-blue-300 active:scale-95 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {busy === n ? '…' : `+${n}`}
          </button>
        ))}
      </div>
      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
