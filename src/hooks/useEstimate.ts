'use client';

import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../lib/apiClient';
import type { BatchEstimateDto } from '../types/business/batches';

type State = { key: string; estimate: BatchEstimateDto | null; error: string | null };

/** Debounced POST /api/app/batches/estimate for a draft. Pass null while the draft is incomplete. */
export const useEstimate = (draft: Record<string, unknown> | null) => {
  const key = draft ? JSON.stringify(draft) : '';
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      apiFetch<{ estimate: BatchEstimateDto }>('/api/app/batches/estimate', { method: 'POST', body: key, headers: { 'Content-Type': 'application/json' } })
        .then((res) => !cancelled && setState({ key, estimate: res.estimate, error: null }))
        .catch((err: unknown) => !cancelled && setState({ key, estimate: null, error: err instanceof ApiError ? err.message : 'Could not estimate this batch.' }));
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key]);

  const current = state?.key === key ? state : null;
  return { estimate: current?.estimate ?? null, error: current?.error ?? null, loading: Boolean(key) && !current };
};
