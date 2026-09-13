'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { productStore } from '../../../lib/localStore';
import type { MeDto, ProductLineDto } from '../../../types/business/me';

type MeState = { key: string; me: MeDto | null; error: string | null };

type WorkspaceContextValue = {
  me: MeDto | null;
  loading: boolean;
  error: string | null;
  product: ProductLineDto | null;
  refresh: () => void;
  switchProduct: (product: ProductLineDto) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ token, children }: { token: string; children: ReactNode }) => {
  const stored = productStore.useValue();
  const preferred: ProductLineDto | null = stored === 'brand' || stored === 'shop' ? stored : null;
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<MeState | null>(null);
  const key = `${token}:${preferred ?? ''}:${nonce}`;

  useEffect(() => {
    let cancelled = false;
    const query = preferred ? `?product=${preferred}` : '';
    apiFetch<MeDto>(`/api/app/me${query}`)
      .then((me) => !cancelled && setState({ key, me, error: null }))
      .catch((err: unknown) => {
        if (!cancelled) setState({ key, me: null, error: err instanceof ApiError ? err.message : 'Could not load your workspace.' });
      });
    return () => {
      cancelled = true;
    };
  }, [key, preferred]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const switchProduct = useCallback((product: ProductLineDto) => productStore.set(product), []);

  const value = useMemo<WorkspaceContextValue>(() => {
    const current = state?.key === key ? state : null;
    // Keep showing the previous data while refreshing, so the shell doesn't flash.
    const me = current?.me ?? state?.me ?? null;
    return {
      me,
      loading: !current,
      error: current?.error ?? null,
      product: me?.workspace?.product ?? null,
      refresh,
      switchProduct,
    };
  }, [state, key, refresh, switchProduct]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
};
