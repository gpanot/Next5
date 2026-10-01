'use client';

import { useState } from 'react';
import type { Pins } from './monthPlan';

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

const isDayKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** The day the user's posting plan starts ("Add post" on that day), or null with no plan. */
export const usePlanStart = (runId: string) =>
  useRunStore<string | null>(`autoSlideshow.planStart.${runId}`, (raw) => (isDayKey(raw) ? raw : null), (v) => v);

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
export const usePins = (runId: string) => useRunStore<Pins>(`autoSlideshow.pins.${runId}`, parsePins, (v) => JSON.stringify(v));
