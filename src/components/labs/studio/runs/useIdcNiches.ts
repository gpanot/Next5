'use client';

import { useEffect, useState } from 'react';
import { getRun } from '../api';
import { useStudioRunContext } from './StudioRunContext';

type NicheState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; niches: string[]; sourceUrl: string }
  | { status: 'error'; error: string };

/** Profile → Market → IDC Niches, as a clean string list. */
export function readIdcNiches(data: Record<string, unknown>): string[] {
  const market = data.market as { targetCustomerIndustries?: { value?: unknown } } | undefined;
  const value = market?.targetCustomerIndustries?.value;
  if (!Array.isArray(value)) return [];
  const niches = value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set(niches));
}

/**
 * IDC niches of the linked run. Fetched on mount, so edits saved in the Profile step show up
 * when the research step opens.
 */
export function useIdcNiches() {
  const studio = useStudioRunContext();
  const token = studio?.token ?? null;
  const runId = studio?.runId ?? null;
  /** Last fetch result, tagged with its run so a run switch reads as loading, not stale data. */
  const [result, setResult] = useState<{ runId: string; state: NicheState } | null>(null);

  useEffect(() => {
    if (!token || !runId) return undefined;
    let cancelled = false;
    getRun(token, runId)
      .then((run) => {
        if (cancelled) return;
        const niches = readIdcNiches(run.brandProfile.data);
        setResult({ runId, state: { status: 'ready', niches, sourceUrl: run.brandProfile.sourceUrl } });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({ runId, state: { status: 'error', error: e instanceof Error ? e.message : 'Failed to load run' } });
      });
    return () => { cancelled = true; };
  }, [token, runId]);

  const state: NicheState =
    !runId ? { status: 'idle' }
    : result?.runId === runId ? result.state
    : { status: 'loading' };

  return { linked: studio !== null, hasRun: runId !== null, state };
}
