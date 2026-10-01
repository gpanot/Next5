'use client';

import { useState } from 'react';

export const MAX_PER_DAY = 5;

/** Default times for 1 to 5 posts a day, spread over the hours people scroll most. */
export const DEFAULT_TIMES: Record<number, string[]> = {
  1: ['19:00'],
  2: ['12:00', '19:00'],
  3: ['09:00', '13:00', '19:00'],
  4: ['09:00', '12:00', '16:00', '19:00'],
  5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
};

const KEY = 'autoSlideshow.postTimes';
const isTime = (t: unknown): t is string => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t);

const read = (): string[] => {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    return Array.isArray(saved) && saved.length >= 1 && saved.length <= MAX_PER_DAY && saved.every(isTime) ? saved : DEFAULT_TIMES[1]!;
  } catch {
    return DEFAULT_TIMES[1]!;
  }
};

/** The daily posting times (["19:00"]); their count is posts a day. Remembered in this browser only. */
export const usePostTimes = (): [string[], (times: string[]) => void] => {
  const [times, setTimes] = useState<string[]>(() => (typeof window === 'undefined' ? DEFAULT_TIMES[1]! : read()));
  const save = (next: string[]) => {
    setTimes(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: the times still apply for this visit.
    }
  };
  return [times, save];
};
