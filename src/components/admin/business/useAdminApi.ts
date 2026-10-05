'use client';

import { useCallback, useEffect, useState } from 'react';
import { UNAUTHORIZED_EVENT } from '../../../lib/apiClient';

type Result<T> = { key: string; data: T | null; error: string | null };

export const adminFetch = async <T,>(token: string, path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  if (!res.ok) throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
  return data;
};

/**
 * Last good response per token + path, for this tab. Shown at once when a page opens again (stale while revalidate),
 * then replaced by the fresh response. Capped so a long session does not grow without bound.
 */
const CACHE_LIMIT = 100;
const responseCache = new Map<string, unknown>();
/** GETs in flight, so a prefetch and the hook that needs the same data share one request. */
const inFlight = new Map<string, Promise<unknown>>();

const cacheKey = (token: string, path: string) => `${token}\n${path}`;

const remember = (key: string, data: unknown) => {
  responseCache.delete(key);
  responseCache.set(key, data);
  if (responseCache.size > CACHE_LIMIT) responseCache.delete(responseCache.keys().next().value as string);
};

/** One GET, cached on success. `shared` joins a request already in flight for the same data instead of starting one. */
const cachedFetch = <T,>(token: string, path: string, shared: boolean): Promise<T> => {
  const key = cacheKey(token, path);
  const pending = shared ? inFlight.get(key) : undefined;
  if (pending) return pending as Promise<T>;
  const request = adminFetch<T>(token, path)
    .then((data) => {
      remember(key, data);
      return data;
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
};

/** Starts loading data a page will ask for, so its request runs in parallel with whatever it waits on first. */
export const prefetchAdminApi = (token: string, path: string) => {
  cachedFetch(token, path, true).catch(() => undefined);
};

/**
 * GET with the admin token; keyed so stale responses never overwrite newer ones. A null `path` waits (no request).
 * Data seen before in this tab shows at once while the fresh copy loads (`loading` stays true until it lands).
 */
export const useAdminApi = <T,>(token: string, path: string | null) => {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = `${path}#${nonce}`;

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    // The first load may join a prefetch; a refresh always asks the server again.
    cachedFetch<T>(token, path, nonce === 0)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((err: unknown) => !cancelled && setResult({ key, data: null, error: err instanceof Error ? err.message : 'Failed' }));
    return () => {
      cancelled = true;
    };
  }, [token, path, key, nonce]);

  const current = result?.key === key ? result : null;
  const cached = path === null ? null : ((responseCache.get(cacheKey(token, path)) as T | undefined) ?? null);
  return {
    data: current ? current.data : (cached ?? result?.data ?? null),
    error: current?.error ?? null,
    loading: !current,
    refresh: useCallback(() => setNonce((n) => n + 1), []),
  };
};
