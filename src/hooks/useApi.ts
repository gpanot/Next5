'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../lib/apiClient';

type Result<T> = { key: string; data: T | null; error: string | null };

/** GET `path` with the session token. Pass null to skip. State is keyed by path so stale data never leaks. */
export const useApi = <T>(path: string | null) => {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = path ? `${path}#${nonce}` : '';

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    apiFetch<T>(path)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((err: unknown) => !cancelled && setResult({ key, data: null, error: err instanceof ApiError ? err.message : 'Something went wrong.' }));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const current = result?.key === key ? result : null;
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return {
    data: current?.data ?? (result && path && result.key.startsWith(`${path}#`) ? result.data : null),
    error: current?.error ?? null,
    loading: Boolean(path) && !current,
    refresh,
  };
};
