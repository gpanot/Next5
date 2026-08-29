'use client';

import { useEffect, useState } from 'react';

type GenerationProgressBarProps = {
  /** ms at which the bar reaches `HOLD_AT` and waits — real generation time
   *  varies, so this is a pace to feel right against, not a promise. */
  expectedMs?: number;
};

const HOLD_AT = 92;
const TICK_MS = 200;
/** Total countdown duration displayed beside the bar (seconds). */
const COUNTDOWN_START = 40;

/** Fills toward `HOLD_AT`% over `expectedMs`, then holds — never reaches 100%
 *  on its own, since the screen it lives on is swapped out the moment
 *  generation actually finishes. Mounted once for the whole wait: it isn't
 *  keyed to the uploading/generating sub-phase, so it doesn't restart when
 *  that flips. Shows a visible countdown timer beside the bar. */
export const GenerationProgressBar = ({ expectedMs = 40000 }: GenerationProgressBarProps) => {
  const [percent, setPercent] = useState(0);
  const [seconds, setSeconds] = useState(COUNTDOWN_START);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setPercent(Math.min(HOLD_AT, (elapsed / expectedMs) * 100));
      setSeconds(Math.max(0, COUNTDOWN_START - Math.floor(elapsed / 1000)));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [expectedMs]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>Generating your shot…</span>
        <span className="tabular-nums font-medium text-ink">{mm}:{ss}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Preparing your shot"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 w-full overflow-hidden rounded-full bg-surface-alt"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
