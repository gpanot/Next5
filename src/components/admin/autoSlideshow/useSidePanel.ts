'use client';

import { useState } from 'react';
import type { AutoRunStatus } from '../../../types/admin/autoSlideshow';

const KEY = 'autoSlideshow.sidePanel';

const readSaved = (): boolean | null => {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === 'open' ? true : saved === 'closed' ? false : null;
  } catch {
    return null;
  }
};

/**
 * Brand card and agent log on the side: open while a run works (the first time it explains what happens), closed once
 * it is done. After the user toggles it, their choice sticks in this browser. The third value sets it (the ideas panel
 * folds it away).
 */
export const useSidePanel = (status: AutoRunStatus | undefined): [boolean, () => void, (open: boolean) => void] => {
  const [saved, setSaved] = useState<boolean | null>(() => (typeof window === 'undefined' ? null : readSaved()));
  const open = saved ?? status !== 'COMPLETED';
  const set = (next: boolean) => {
    setSaved(next);
    try {
      window.localStorage.setItem(KEY, next ? 'open' : 'closed');
    } catch {
      // Private mode or blocked storage: the choice still applies for this visit.
    }
  };
  return [open, () => set(!open), set];
};
