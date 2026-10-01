'use client';

import { formatElapsed, useNow } from '../shared/runClock';

/** A run usually takes about two minutes, start to finish. */
export const TYPICAL_RUN_MS = 120_000;

/** "~2:00 min" estimate that counts down while the run works, so a long wait never feels stuck. */
export function RunEta({ startedAt }: { startedAt: string }) {
  const now = useNow(true);
  const left = TYPICAL_RUN_MS - (now - new Date(startedAt).getTime());
  const late = left <= 0;
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300" aria-live="off">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M10 2h4" />
      </svg>
      {late ? 'Almost done…' : <span>~2:00 min · <span className="tabular-nums">{formatElapsed(left)}</span> left</span>}
    </p>
  );
}
