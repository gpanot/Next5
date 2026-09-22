'use client';

import { useEffect } from 'react';
import { useApi } from '../../../../hooks/useApi';
import type { InfluencerDto } from '../../../../types/business/influencers';

const POLL_MS = 5_000;

/** Brand influencers; re-fetches every few seconds while any variation is still being made. */
export const useInfluencers = (status: 'active' | 'archived' = 'active') => {
  const api = useApi<{ influencers: InfluencerDto[] }>(`/api/app/influencers?product=brand&status=${status}`);
  const { refresh } = api;
  const pending = status === 'active' && (api.data?.influencers ?? []).some((i) => i.pendingCount > 0);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  return api;
};
