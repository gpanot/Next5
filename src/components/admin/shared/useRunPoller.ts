'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../business/useAdminApi';

type Options<T> = {
  /** Keeps polling while this returns true for the latest data. */
  isChanging: (data: T) => boolean;
  intervalMs?: number;
};

/**
 * GETs `path` and repeats while `isChanging` says the data is still moving; a failed request retries at half speed.
 * `refresh` restarts polling (e.g. after the user starts new work on the same resource).
 */
export const useRunPoller = <T,>(token: string, path: string, { isChanging, intervalMs = 1_500 }: Options<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const next = await adminFetch<T>(token, path);
        if (cancelled) return;
        setData(next);
        setError(null);
        if (isChanging(next)) timer = setTimeout(tick, intervalMs);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
        timer = setTimeout(tick, intervalMs * 2);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // isChanging is a pure predicate; callers pass a module-level function, so it is left out of the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, path, intervalMs, nonce]);

  return { data, error, refresh: useCallback(() => setNonce((n) => n + 1), []) };
};
