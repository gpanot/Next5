'use client';

/**
 * Links a lab to a Campaign Studio run.
 *
 * UGC Lab and Blitz Slideshow stay transport-agnostic: they only show the Profile step and the
 * IDC niche picker when a <StudioRunProvider> surrounds them. The admin tabs provide one; a lab
 * rendered without it behaves as before.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSelectedRunId } from './useSelectedRunId';

type StudioRunContextValue = {
  token: string;
  runId: string | null;
  selectRun: (runId: string | null) => void;
};

const StudioRunContext = createContext<StudioRunContextValue | null>(null);

/** The linked run, or null when the lab runs without Campaign Studio. */
export const useStudioRunContext = (): StudioRunContextValue | null => useContext(StudioRunContext);

export function StudioRunProvider({ token, children }: { token: string; children: ReactNode }) {
  const [runId, selectRun] = useSelectedRunId();
  const value = useMemo(() => ({ token, runId, selectRun }), [token, runId, selectRun]);
  return <StudioRunContext.Provider value={value}>{children}</StudioRunContext.Provider>;
}
