/**
 * Client-side fetch wrapper for /api/app/** — adds the session token, parses JSON,
 * and turns error responses into typed ApiError instances.
 */

export const STUDIO_TOKEN_KEY = 'studio_token';
export const UNAUTHORIZED_EVENT = 'next5:unauthorized';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const getStoredToken = (): string | null => {
  try {
    return window.localStorage.getItem(STUDIO_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const storeToken = (token: string): void => {
  try {
    window.localStorage.setItem(STUDIO_TOKEN_KEY, token);
  } catch {
    // Storage blocked (private mode) — the session lasts for this page only.
  }
};

export const clearToken = (): void => {
  try {
    window.localStorage.removeItem(STUDIO_TOKEN_KEY);
  } catch {
    // ignore
  }
};

type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit };

type ErrorBody = { error?: string; message?: string; details?: Record<string, unknown> };

export const apiFetch = async <T>(path: string, init: ApiInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  } catch {
    throw new ApiError(0, 'network_error', "We couldn't reach Next5. Check your connection and try again.");
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = (data ?? {}) as ErrorBody;
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, body.error ?? 'request_failed', body.message ?? 'Something went wrong. Please try again.', body.details);
  }
  return data as T;
};
