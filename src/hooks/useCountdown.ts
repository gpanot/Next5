'use client';

import { useEffect, useState } from 'react';

/** Seconds left until `until` (ISO string), ticking every second. 0 when passed or null. */
export const useCountdown = (until: string | null): number => {
  const compute = () => (until ? Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(compute);

  useEffect(() => {
    if (!until) return;
    const update = () => setSeconds(Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 1000)));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [until]);

  return seconds;
};

export const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
