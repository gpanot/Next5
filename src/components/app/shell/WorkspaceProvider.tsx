'use client';

import { useParams } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { productStore } from '../../../lib/localStore';
import { isStudio, studioHref } from '../../../lib/studioPaths';
import type { MeDto, ProductLineDto } from '../../../types/business/me';

type MeState = { key: string; me: MeDto | null; error: string | null };

type WorkspaceContextValue = {
  me: MeDto | null;
  loading: boolean;
  error: string | null;
  /** The studio being shown (from the URL, else the last one used). */
  product: ProductLineDto | null;
  /** Studio from the URL segment, when the page is inside /app/brand or /app/shop. */
  routeStudio: ProductLineDto | null;
  refresh: () => void;
  /** `href('/create')` → `/app/{studio}/create`. */
  href: (path?: string) => string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ token, children }: { token: string; children: ReactNode }) => {
  const params = useParams<{ studio?: string }>();
  const routeStudio = isStudio(params?.studio) ? params.studio : null;
  const stored = productStore.useValue();
  const preferred: ProductLineDto | null = routeStudio ?? (isStudio(stored) ? stored : null);
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

  // Remember the last studio the user actually has (not one they only looked at).
  const loadedStudio = state?.key === key ? state.me?.workspace?.product ?? null : null;
  useEffect(() => {
    if (routeStudio && loadedStudio === routeStudio && stored !== routeStudio) productStore.set(routeStudio);
  }, [routeStudio, loadedStudio, stored]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo<WorkspaceContextValue>(() => {
    const current = state?.key === key ? state : null;
    // Keep showing the previous data while refreshing, so the shell doesn't flash.
    const me = current?.me ?? state?.me ?? null;
    const product = routeStudio ?? me?.workspace?.product ?? null;
    return {
      me,
      loading: !current,
      error: current?.error ?? null,
      product,
      routeStudio,
      refresh,
      href: (path = '') => studioHref(product ?? 'brand', path),
    };
  }, [state, key, refresh, routeStudio]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

/** Like useWorkspace, but returns null outside the app shell (e.g. onboarding). */
export const useOptionalWorkspace = (): WorkspaceContextValue | null => useContext(WorkspaceContext);

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
};
