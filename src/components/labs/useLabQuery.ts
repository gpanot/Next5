'use client';

/**
 * GET through the lab client, keyed so a stale response never overwrites a newer one.
 *
 * The admin-only `useAdminApi` did the same job; this one takes its client from context, so a
 * panel using it works in the admin tab and on the user side without changing.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLabClient } from './LabClientProvider';
import { errorOf } from './labClient';

type Result<T> = { key: string; data: T | null; error: string | null };

export const useLabQuery = <T,>(path: string) => {
  const client = useLabClient();
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = `${client.id}#${path}#${nonce}`;

  useEffect(() => {
    let cancelled = false;
    client
      .request<T>(path)
      .then((res) => {
        if (cancelled) return;
        setResult(res.ok ? { key, data: res.data, error: null } : { key, data: null, error: errorOf(res) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ key, data: null, error: err instanceof Error ? err.message : 'Failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [client, path, key]);

  const current = result?.key === key ? result : null;
  return {
    data: current?.data ?? result?.data ?? null,
    error: current?.error ?? null,
    loading: !current,
    refresh: useCallback(() => setNonce((n) => n + 1), []),
  };
};
