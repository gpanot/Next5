'use client';

import { useEffect, useState } from 'react';

/** Ticks once a second while `active`, so elapsed timers stay live. */
export const useNow = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [active]);
  return now;
};

/** Run duration: until `finishedAt`, else until `now`. */
export const elapsedBetween = (startedAt: string, finishedAt: string | null, now: number) =>
  (finishedAt ? new Date(finishedAt).getTime() : now) - new Date(startedAt).getTime();

export const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** " · 4.2s" for a finished step, empty while it has no timing. */
export const stepSeconds = (ms: number | undefined) => (ms ? ` · ${(ms / 1000).toFixed(1)}s` : '');
