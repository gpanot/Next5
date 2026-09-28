'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MetaAdVideoDto } from '../../../types/admin/metaAds';
import { adminFetch } from '../business/useAdminApi';

const POLL_MS = 4_000;

const isWorking = (v: MetaAdVideoDto) => v.status === 'scripting' || v.status === 'avatar' || v.status === 'video';

/**
 * One ad's video attempts, newest first. Polls while one is being made (each poll also lets the server finish a
 * Wan task that outlived its background job); calls `onSettled` when the newest one ends, so the run's cost refreshes.
 */
export const useAdVideos = (token: string, runId: string, adId: string, onSettled: () => void) => {
  const [videos, setVideos] = useState<MetaAdVideoDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasWorking = false;
    const tick = async () => {
      try {
        const data = await adminFetch<{ videos: MetaAdVideoDto[] }>(token, `/api/admin/meta-ads/runs/${runId}/ads/${adId}/videos`);
        if (cancelled) return;
        setVideos(data.videos);
        setError(null);
        const working = data.videos.some(isWorking);
        if (wasWorking && !working) onSettled();
        wasWorking = working;
        if (working) timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load videos');
        timer = setTimeout(tick, POLL_MS * 2);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, runId, adId, nonce, onSettled]);

  return { videos, error, refresh: useCallback(() => setNonce((n) => n + 1), []), isWorking };
};
