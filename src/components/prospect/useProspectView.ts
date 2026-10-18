'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProspectViewDto } from '../../types/admin/prospects';

type State = { data: ProspectViewDto | null; error: string | null; loading: boolean };

/** The pack's posts for the review page (public, no login). */
export function useProspectView(token: string) {
  const [state, setState] = useState<State>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/prospect/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as ProspectViewDto & { message?: string };
        if (!res.ok) throw new Error(res.status === 404 ? 'This link does not work. Ask for a new one.' : body.message ?? 'Could not load your posts.');
        if (!cancelled) setState({ data: body, error: null, loading: false });
      })
      .catch((err: unknown) => !cancelled && setState({ data: null, error: err instanceof Error ? err.message : 'Could not load your posts.', loading: false }));
    return () => {
      cancelled = true;
    };
  }, [token, nonce]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setNonce((n) => n + 1);
  }, []);

  return { ...state, retry };
}
