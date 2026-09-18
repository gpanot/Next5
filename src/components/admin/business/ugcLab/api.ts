'use client';

export { adminFetch, useAdminApi } from '../useAdminApi';

export type UgcResponse<T> = { ok: boolean; status: number; data: T & { error?: string; message?: string } };

/** JSON or multipart request with the admin token. Never throws on HTTP errors, so callers can read 402 payloads. */
export const ugcRequest = async <T,>(token: string, path: string, init: { method?: string; json?: unknown; form?: FormData } = {}): Promise<UgcResponse<T>> => {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method: init.method ?? (init.json !== undefined || init.form ? 'POST' : 'GET'),
    headers,
    body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  return { ok: res.ok, status: res.status, data };
};

/** The error text to show for a failed request. */
export const errorOf = (res: UgcResponse<unknown>): string =>
  res.data.message ?? res.data.error ?? `Request failed (${res.status})`;
