'use client';

import { useCallback, useState } from 'react';

/** One key for every tab, so a run picked in Campaign Studio is already picked in UGC Lab and Blitz. */
const STORAGE_KEY = 'studio:selected-run';

const readStored = (): string | null => {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

/** The Campaign Studio run the admin is working on, remembered across tabs and reloads. */
export function useSelectedRunId() {
  const [runId, setRunIdState] = useState<string | null>(readStored);

  const setRunId = useCallback((id: string | null) => {
    setRunIdState(id);
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked — the selection still holds for this session.
    }
  }, []);

  return [runId, setRunId] as const;
}
