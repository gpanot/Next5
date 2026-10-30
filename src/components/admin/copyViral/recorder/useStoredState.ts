'use client';

import { useState } from 'react';

const read = <T,>(key: string, fallback: T, valid: (v: unknown) => v is T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    const value: unknown = raw === null ? null : JSON.parse(raw);
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

/** A recorder setting remembered on this browser (the recorder only mounts after a click, so localStorage is there). */
export const useStoredState = <T,>(key: string, fallback: T, valid: (v: unknown) => v is T) => {
  const [value, setValue] = useState<T>(() => read(key, fallback, valid));
  const set = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // private window: the pick just isn't remembered
    }
  };
  return [value, set] as const;
};
