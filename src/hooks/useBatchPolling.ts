'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../lib/apiClient';
import type { BatchDetailDto } from '../types/business/batches';

const BASE_INTERVAL_MS = 4_000;
const MAX_BACKOFF_MS = 30_000;

type State = { batch: BatchDetailDto | null; error: string | null; loading: boolean };

const isActive = (batch: BatchDetailDto | null): boolean =>
  !batch || batch.status === 'queued' || batch.status === 'generating';

/**
 * Loads a batch and polls every 4 s while it is generating (each GET also advances generation).
 * Backs off on errors up to 30 s and pauses while the tab is hidden.
 */
export const useBatchPolling = (batchId: string | null) => {
  const [state, setState] = useState<State>({ batch: null, error: null, loading: true });
  const failures = useRef(0);
  const timer = useRef<number | null>(null);

  const load = useCallback(async (): Promise<BatchDetailDto | null> => {
    if (!batchId) return null;
    try {
      const data = await apiFetch<{ batch: BatchDetailDto }>(`/api/app/batches/${batchId}`);
      failures.current = 0;
      setState({ batch: data.batch, error: null, loading: false });
      return data.batch;
    } catch (err) {
      failures.current += 1;
      const message = err instanceof ApiError ? err.message : 'Could not load this batch.';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      return err instanceof ApiError && err.status === 404 ? null : state.batch;
    }
    // `state.batch` is only a fallback for the return value; polling doesn't depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // Polling stops once the batch is done; a redo makes it active again, which restarts the loop.
  const active = isActive(state.batch);

  useEffect(() => {
    if (!batchId || (!active && state.batch)) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const batch = document.hidden ? state.batch : await load();
      if (stopped || !isActive(batch)) return;
      const delay = Math.min(MAX_BACKOFF_MS, BASE_INTERVAL_MS * 2 ** failures.current);
      timer.current = window.setTimeout(() => void tick(), delay);
    };
    void tick();

    return () => {
      stopped = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
    // Restart polling only when the batch changes or becomes active again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, load, active]);

  /** Replace one item locally after an action (favourite, redo) without waiting for the next poll. */
  const patchItem = useCallback((itemId: string, patch: Partial<BatchDetailDto['items'][number]>) => {
    setState((prev) =>
      prev.batch
        ? { ...prev, batch: { ...prev.batch, items: prev.batch.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } }
        : prev,
    );
  }, []);

  return { ...state, refresh: load, patchItem };
};
