'use client';

/**
 * The transport the four labs talk through.
 *
 * The labs used to call `/api/admin/...` directly with an admin JWT threaded down as a `token`
 * prop. That made them admin-only by construction. A `LabClient` is the seam instead: the editors
 * know they can send a request, and nothing more. Who is signed in, which base path answers, and
 * how the request is authenticated is the caller's business.
 */

export type LabResponse<T> = {
  ok: boolean;
  status: number;
  data: T & { error?: string; message?: string };
};

export type LabRequestInit = {
  method?: string;
  json?: unknown;
  form?: FormData;
};

export type LabClient = {
  /**
   * Stable identity for cache keys and effect dependencies. Derived from the base path and the
   * signed-in identity, never the credential itself — it ends up in React keys and in Maps.
   */
  readonly id: string;
  /** Path relative to the lab API root, starting with a slash: '/ugc-lab/videos'. */
  request<T>(path: string, init?: LabRequestInit): Promise<LabResponse<T>>;
  /** Absolute URL for a lab route, for the few places that need a raw `fetch` (uploads, links). */
  url(path: string): string;
  /** Headers that authenticate a raw `fetch` built from `url()`. */
  authHeaders(): Record<string, string>;
};

/** The error text to show for a failed request. */
export const errorOf = (res: LabResponse<unknown>): string =>
  res.data.message ?? res.data.error ?? `Request failed (${res.status})`;

type ClientOptions = {
  id: string;
  basePath: string;
  authHeaders: () => Record<string, string>;
  /** Send cookies. The app client is cookie-authenticated; the admin client is not. */
  credentials?: RequestCredentials;
};

/**
 * Never throws on an HTTP error, so callers can read the body of a 402 or a 422 rather than
 * losing it to an exception. Network failures still reject.
 */
const createLabClient = ({ id, basePath, authHeaders, credentials }: ClientOptions): LabClient => ({
  id,
  url: (path: string) => `${basePath}${path}`,
  authHeaders,
  async request<T>(path: string, init: LabRequestInit = {}): Promise<LabResponse<T>> {
    const headers: Record<string, string> = { ...authHeaders() };
    if (init.json !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${basePath}${path}`, {
      method: init.method ?? (init.json !== undefined || init.form ? 'POST' : 'GET'),
      headers,
      credentials,
      body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
    return { ok: res.ok, status: res.status, data };
  },
});

/** The labs as the admin tabs run them: bearer token, `/api/admin` routes, Next5-owned rows. */
export const createAdminLabClient = (token: string): LabClient =>
  createLabClient({
    // The token is a credential, so the id is a fingerprint of it rather than the token itself.
    id: `admin:${token.slice(-12)}`,
    basePath: '/api/admin',
    authHeaders: () => ({ Authorization: `Bearer ${token}` }),
  });

/**
 * The labs as a signed-in business runs them: session cookie, `/api/app/labs` routes, rows owned
 * by her workspace.
 *
 * Those routes do not exist yet — the user-side surface is built before it is wired. This factory
 * is what the user-side pages will pass once they do, and it is the reason nothing below
 * `src/components/labs/` imports anything from `src/components/admin/`.
 */
export const createAppLabClient = (workspaceId: string): LabClient =>
  createLabClient({
    id: `app:${workspaceId}`,
    basePath: '/api/app/labs',
    authHeaders: () => ({}),
    credentials: 'same-origin',
  });
