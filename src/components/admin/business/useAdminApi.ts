'use client';

import { useCallback, useEffect, useState } from 'react';

type Result<T> = { key: string; data: T | null; error: string | null };

export const adminFetch = async <T,>(token: string, path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
  return data;
};

/** GET with the admin token; keyed so stale responses never overwrite newer ones. */
export const useAdminApi = <T,>(token: string, path: string) => {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = `${path}#${nonce}`;

  useEffect(() => {
    let cancelled = false;
    adminFetch<T>(token, path)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((err: unknown) => !cancelled && setResult({ key, data: null, error: err instanceof Error ? err.message : 'Failed' }));
    return () => {
      cancelled = true;
    };
  }, [token, path, key]);

  const current = result?.key === key ? result : null;
  return { data: current?.data ?? result?.data ?? null, error: current?.error ?? null, loading: !current, refresh: useCallback(() => setNonce((n) => n + 1), []) };
};
