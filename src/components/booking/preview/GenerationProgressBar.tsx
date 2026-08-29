'use client';

import { useEffect, useState } from 'react';

type GenerationProgressBarProps = {
  /** ms at which the bar reaches `HOLD_AT` and waits — real generation time
   *  varies, so this is a pace to feel right against, not a promise. */
  expectedMs?: number;
};

const HOLD_AT = 92;
const TICK_MS = 200;

/** Fills toward `HOLD_AT`% over `expectedMs`, then holds — never reaches 100%
 *  on its own, since the screen it lives on is swapped out the moment
 *  generation actually finishes. Mounted once for the whole wait: it isn't
 *  keyed to the uploading/generating sub-phase, so it doesn't restart when
 *  that flips. */
export const GenerationProgressBar = ({ expectedMs = 20000 }: GenerationProgressBarProps) => {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setPercent(Math.min(HOLD_AT, (elapsed / expectedMs) * 100));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [expectedMs]);

  return (
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
  );
};
