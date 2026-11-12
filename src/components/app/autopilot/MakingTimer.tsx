'use client';

import { useEffect, useState } from 'react';

/** A listing video takes about 3 minutes to make. */
export const VIDEO_MAKE_MS = 3 * 60_000;

const useNow = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
};

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Countdown from approve time to the ~3-minute mark, then "Almost done". Survives leaving and coming back. */
export const MakingTimer = ({ startedAt }: { startedAt: string }) => {
  const left = Date.parse(startedAt) + VIDEO_MAKE_MS - useNow(true);
  return (
    <span className="font-mono text-[13px] font-semibold tabular-nums text-app-ink" aria-live="off">
      {left > 0 ? mmss(left) : 'Almost done'}
    </span>
  );
};
