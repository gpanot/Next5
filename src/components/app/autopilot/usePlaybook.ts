'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../lib/apiClient';
import type { CampaignDto } from '../../../types/business/campaigns';
import { getPlaybook } from './api';

const POLL_MS = 5000;

const isMaking = (c: CampaignDto | null) => Boolean(c && c.status === 'scheduled' && c.posts.some((p) => !p.skipped && p.mediaStatus === 'generating'));

type Loaded = { campaign: CampaignDto | null; error: string | null; done: boolean };

/** One playbook campaign: loads it, and polls while its posts are still being made. */
export const usePlaybook = (id: string | null) => {
  const [state, setState] = useState<Loaded>({ campaign: null, error: null, done: !id });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPlaybook(id)
      .then((campaign) => !cancelled && setState({ campaign, error: null, done: true }))
      .catch((err: unknown) => !cancelled && setState((prev) => ({ ...prev, error: err instanceof ApiError ? err.message : 'Could not open this plan.', done: true })));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setCampaign = useCallback((campaign: CampaignDto) => setState({ campaign, error: null, done: true }), []);

  const making = isMaking(state.campaign);
  useEffect(() => {
    if (!making) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [making, reload]);

  return { campaign: state.campaign, setCampaign, loading: !state.done, error: state.error, reload, making };
};
