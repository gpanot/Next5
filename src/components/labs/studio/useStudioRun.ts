'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearResearch,
  getRun,
  listCandidates,
  listResearchItems,
  resetRun,
  triggerExtract,
  triggerGenerate,
  triggerResearch,
  type StudioCandidateDto,
  type StudioResearchItemDto,
  type StudioRunFull,
} from './api';

type PollStatus = 'idle' | 'pending' | 'running' | 'done' | 'failed';

const POLLING_INTERVAL_MS = 3_000;
/** Stop polling after this long regardless of status (handles stuck/orphaned jobs in local dev). */
const POLL_TIMEOUT_MS = 2 * 60_000; // 2 minutes — waitUntil is a no-op in local dev

/**
 * Hook to manage a single studio run's state with background polling.
 * Polls while any stage is in 'pending' | 'running'.
 */
export function useStudioRun(token: string, runId: string | null) {
  const [run, setRun] = useState<StudioRunFull | null>(null);
  const [items, setItems] = useState<StudioResearchItemDto[]>([]);
  const [candidates, setCandidates] = useState<StudioCandidateDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number | null>(null);

  const isActive = (status: PollStatus) => status === 'pending' || status === 'running';

  // Keep a ref to the latest run so the interval callback always reads the current value
  const runRef = useRef<StudioRunFull | null>(null);

  const refresh = useCallback(async () => {
    if (!runId) return;
    try {
      const [freshRun, freshItems, freshCandidates] = await Promise.all([
        getRun(token, runId),
        listResearchItems(token, runId),
        listCandidates(token, runId),
      ]);
      runRef.current = freshRun;
      setRun(freshRun);
      setItems(freshItems);
      setCandidates(freshCandidates);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [token, runId]);

  // Poll while a job is running
  useEffect(() => {
    if (!runId) return;
    void refresh();
    pollStartRef.current = null;
    // eslint-disable-next-line consistent-return
    intervalRef.current = setInterval(() => {
      const current = runRef.current;
      if (!current) return;
      const needsPoll =
        isActive(current.extractStatus as PollStatus) ||
        isActive(current.researchStatus as PollStatus) ||
        isActive(current.generateStatus as PollStatus);

      if (!needsPoll) {
        pollStartRef.current = null;
        return;
      }

      // Start the timeout clock when we first see an active status
      if (pollStartRef.current === null) {
        pollStartRef.current = Date.now();
      }

      // Stop polling and auto-reset if stuck longer than the timeout.
      // waitUntil() is a no-op in local dev — background jobs die on server restart.
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        pollStartRef.current = null;
        // Auto-reset stuck run in DB so the user can retry without psql
        if (runId) {
          void resetRun(token, runId).then(() => refresh()).catch(() => {
            setError('Job timed out and could not be auto-reset. Please refresh.');
          });
        }
        return;
      }

      void refresh();
    }, POLLING_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // re-run when runId changes only — refresh is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const triggerExtractionJob = useCallback(async () => {
    if (!runId) return;
    setError(null);
    await triggerExtract(token, runId);
    // Immediately optimistically mark as running
    setRun((prev) => prev ? { ...prev, extractStatus: 'running' } : prev);
    void refresh();
  }, [token, runId, refresh]);

  const triggerResearchJob = useCallback(async (keywords?: string[]) => {
    if (!runId) return;
    setError(null);
    await triggerResearch(token, runId, keywords);
    setRun((prev) => prev ? { ...prev, researchStatus: 'running' } : prev);
    void refresh();
  }, [token, runId, refresh]);

  const resetJob = useCallback(async () => {
    if (!runId) return;
    setError(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    pollStartRef.current = null;
    await resetRun(token, runId);
    void refresh();
    // Restart polling
    intervalRef.current = setInterval(() => void refresh(), POLLING_INTERVAL_MS);
  }, [token, runId, refresh]);

  const triggerGenerateJob = useCallback(async () => {
    if (!runId) return;
    setError(null);
    await triggerGenerate(token, runId);
    setRun((prev) => prev ? { ...prev, generateStatus: 'running' } : prev);
    void refresh();
  }, [token, runId, refresh]);

  const clearResearchItems = useCallback(async () => {
    if (!runId) return;
    setError(null);
    await clearResearch(token, runId);
    setItems([]);
    setRun((prev) => prev ? { ...prev, researchStatus: 'idle', researchError: null, researchDurationMs: null, researchCostUsdMicros: null } : prev);
  }, [token, runId]);

  return {
    run,
    items,
    candidates,
    error,
    refresh,
    triggerExtractionJob,
    triggerResearchJob,
    triggerGenerateJob,
    resetJob,
    clearResearchItems,
  };
}
