'use client';

import { useEffect, useState } from 'react';
import type { Pins, Targets } from './monthPlan';

/** Sent with the store key when a value was written outside its hook. */
const STORE_EVENT = 'autoSlideshow.runStore';

/** A value remembered per run in this browser only; storage errors (private mode) keep it for this visit. */
const useRunStore = <T,>(key: string, parse: (raw: string | null) => T, serialize: (v: T) => string | null): [T, (v: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return parse(null);
    try {
      return parse(window.localStorage.getItem(key));
    } catch {
      return parse(null);
    }
  });
  // Written elsewhere on the page (the slideshow editor's Schedule): read it again.
  useEffect(() => {
    const reread = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== key) return;
      try {
        setValue(parse(window.localStorage.getItem(key)));
      } catch {
        // Blocked storage: nothing was written.
      }
    };
    window.addEventListener(STORE_EVENT, reread);
    return () => window.removeEventListener(STORE_EVENT, reread);
  }, [key, parse]);
  const save = (next: T) => {
    setValue(next);
    try {
      const raw = serialize(next);
      if (raw === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, raw);
    } catch {
      // Blocked storage: still applies for this visit.
    }
  };
  return [value, save];
};

const isDayKey = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

const parseTargets = (raw: string | null): Targets => {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((e): e is [string, number] => isDayKey(e[0]) && Number.isInteger(e[1]) && e[1] > 0));
  } catch {
    return {};
  }
};

/** Posts the user wants on each day, set day by day with − N +. */
export const useTargets = (runId: string) => useRunStore<Targets>(`autoSlideshow.targets.${runId}`, parseTargets, (v) => JSON.stringify(v));

const pinsKey = (runId: string) => `autoSlideshow.pins.${runId}`;

const parsePins = (raw: string | null): Pins => {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string'));
  } catch {
    return {};
  }
};

/** Where each not-yet-approved slideshow is pinned (dragged, or kept in place when the plan changed). */
export const usePins = (runId: string) => useRunStore<Pins>(pinsKey(runId), parsePins, (v) => JSON.stringify(v));

/** Pins one slideshow on the Calendar at `at` (from outside the Calendar); a mounted Calendar reads it again. */
export const pinOnCalendar = (runId: string, slideshowId: string, at: Date) => {
  const key = pinsKey(runId);
  window.localStorage.setItem(key, JSON.stringify({ ...parsePins(window.localStorage.getItem(key)), [slideshowId]: at.toISOString() }));
  window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
};

/** Where slideshow `slideshowId` is pinned on the Calendar, if it is. */
export const pinOf = (runId: string, slideshowId: string): Date | null => {
  try {
    const raw = parsePins(window.localStorage.getItem(pinsKey(runId)))[slideshowId];
    return raw ? new Date(raw) : null;
  } catch {
    return null;
  }
};

export type CalendarView = 'grid' | 'list';

/** Month as photo tiles or as a list by day: one choice for every run, in this browser. */
export const useCalendarView = () =>
  useRunStore<CalendarView>('autoSlideshow.calendarView', (raw) => (raw === 'list' ? 'list' : 'grid'), (v) => (v === 'list' ? v : null));
