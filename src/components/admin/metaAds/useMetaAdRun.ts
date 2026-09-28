'use client';

import { useCallback, useEffect, useState } from 'react';
import { isTerminalStatus, type MetaAdRunDto } from '../../../types/admin/metaAds';
import { adminFetch } from '../business/useAdminApi';

/** A finished run still changes while one of its ads is being regenerated. */
const isChanging = (run: MetaAdRunDto) => !isTerminalStatus(run.status) || run.ads.some((a) => a.status === 'imaging' || a.status === 'compositing');

const POLL_MS = 1_500;

/** Polls one run until it completes or fails and no ad is being redesigned. `refresh` restarts polling (e.g. after a resume). */
export const useMetaAdRun = (token: string, runId: string) => {
  const [run, setRun] = useState<MetaAdRunDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const data = await adminFetch<{ run: MetaAdRunDto }>(token, `/api/admin/meta-ads/runs/${runId}`);
        if (cancelled) return;
        setRun(data.run);
        setError(null);
        if (isChanging(data.run)) timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load run');
        timer = setTimeout(tick, POLL_MS * 2);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, runId, nonce]);

  return { run, error, refresh: useCallback(() => setNonce((n) => n + 1), []) };
};
