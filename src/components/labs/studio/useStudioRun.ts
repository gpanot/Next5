'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRun,
  listCandidates,
  listResearchItems,
  triggerExtract,
  triggerGenerate,
  triggerResearch,
  type StudioCandidateDto,
  type StudioResearchItemDto,
  type StudioRunFull,
} from './api';

type PollStatus = 'idle' | 'pending' | 'running' | 'done' | 'failed';

const POLLING_INTERVAL_MS = 3_000;

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
    // eslint-disable-next-line consistent-return
    intervalRef.current = setInterval(() => {
      const current = runRef.current;
      if (!current) return;
      const needsPoll =
        isActive(current.extractStatus as PollStatus) ||
        isActive(current.researchStatus as PollStatus) ||
        isActive(current.generateStatus as PollStatus);
      if (needsPoll) void refresh();
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

  const triggerGenerateJob = useCallback(async () => {
    if (!runId) return;
    setError(null);
    await triggerGenerate(token, runId);
    setRun((prev) => prev ? { ...prev, generateStatus: 'running' } : prev);
    void refresh();
  }, [token, runId, refresh]);

  return {
    run,
    items,
    candidates,
    error,
    refresh,
    triggerExtractionJob,
    triggerResearchJob,
    triggerGenerateJob,
  };
}
