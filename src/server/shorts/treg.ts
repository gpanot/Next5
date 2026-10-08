// server-only — never import from a 'use client' file.
// treg proxy calls for Shorts that also return what each call really cost (the X-Treg-Cost-Micro header).

import { HttpError } from '../http';

const TREG_BASE = 'https://treg.to/call';

const tregKey = (): string => {
  const key = process.env.TREG_API_KEY;
  if (!key) throw new HttpError(503, 'treg_not_configured', 'TREG_API_KEY is not set on the server.');
  return key;
};

type CallOptions = { query?: Record<string, string>; body?: unknown; timeoutMs?: number };

const request = async (endpointId: string, { query, body, timeoutMs = 120_000 }: CallOptions): Promise<Response> => {
  const url = new URL(`${TREG_BASE}/${endpointId}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'X-Treg-Token': tregKey(), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`treg ${endpointId}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
  return res;
};

const costOf = (res: Response): number => Number(res.headers.get('x-treg-cost-micro') ?? 0) || 0;

/** One JSON call. `costMicros` is the charge treg settled for it (0 when the header is absent). */
export const tregJson = async <T>(endpointId: string, options: CallOptions = {}): Promise<{ data: T; costMicros: number }> => {
  const res = await request(endpointId, options);
  return { data: (await res.json()) as T, costMicros: costOf(res) };
};

/** One binary call (a video file). */
export const tregBytes = async (endpointId: string, options: CallOptions = {}): Promise<Buffer> => {
  const res = await request(endpointId, options);
  return Buffer.from(await res.arrayBuffer());
};

/** Retries a call that failed for a reason worth retrying (a timeout, a 5xx, a 429), waiting 4 s, 8 s, 12 s… between tries. */
export const withRetry = async <T>(fn: () => Promise<T>, tries = 3): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A dropped connection shows up as aborted, terminated, ECONNRESET or socket hang up depending on the client.
      const retryable = /HTTP (5\d\d|429)|timeout|aborted|terminated|ECONNRESET|socket hang up|fetch failed/i.test(message);
      if (!retryable || attempt >= tries) throw err;
      await new Promise((r) => setTimeout(r, 4_000 * attempt));
    }
  }
};
