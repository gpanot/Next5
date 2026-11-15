'use client';

import { useEffect, useState } from 'react';

/** Shown wait for a video: a 5-minute countdown, so she never waits past what we promised. */
export const VIDEO_MAKE_MS = 5 * 60_000;
/** After the countdown: 80%, then +1% every 10 s, holding at 98% until the video is ready. */
const OVERTIME_START = 80;
const OVERTIME_MAX = 98;
const OVERTIME_STEP_MS = 10_000;

export const useNow = (active: boolean) => {
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

/** "4:12" while counting down, then "80%" … "98%" once the 5 minutes are up. */
export const makingLabel = (startedAt: number, now: number): string => {
  const left = startedAt + VIDEO_MAKE_MS - now;
  if (left > 0) return mmss(left);
  return `${Math.min(OVERTIME_MAX, OVERTIME_START + Math.floor(-left / OVERTIME_STEP_MS))}%`;
};

/** Countdown from approve time to the 5-minute mark, then a slow percentage. Survives leaving and coming back. */
export const MakingTimer = ({ startedAt }: { startedAt: string }) => (
  <span className="font-mono text-[13px] font-semibold tabular-nums text-app-ink" aria-live="off">
    {makingLabel(Date.parse(startedAt), useNow(true))}
  </span>
);
