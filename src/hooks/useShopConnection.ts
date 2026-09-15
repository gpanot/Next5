'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../lib/apiClient';
import type { ShopConnectionDto } from '../types/business/shop';

type State = { loaded: boolean; connection: ShopConnectionDto | null; error: string | null };

/** The store connection; polls every 4 s while an import is running. */
export const useShopConnection = () => {
  const [state, setState] = useState<State>({ loaded: false, connection: null, error: null });
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { connection } = await apiFetch<{ connection: ShopConnectionDto | null }>('/api/app/shop/connection');
      setState({ loaded: true, connection, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loaded: true, error: err instanceof ApiError ? err.message : 'Could not load your store.' }));
    }
  }, []);

  useEffect(() => {
    // Initial load runs in a microtask so no state is set synchronously inside the effect.
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const syncing = state.connection?.status === 'syncing';
  useEffect(() => {
    if (!syncing) return;
    timer.current = window.setInterval(() => void load(), 4_000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [syncing, load]);

  return { ...state, refresh: load, setConnection: (connection: ShopConnectionDto) => setState({ loaded: true, connection, error: null }) };
};
