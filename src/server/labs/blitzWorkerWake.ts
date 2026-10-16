/**
 * Wakes the blitz-worker (Railway) when a render is queued.
 *
 * The worker sleeps when idle: it stops polling and closes its DB connection, so Railway puts the service to sleep
 * and memory stops billing. Any queued render must ping it, or the job waits in PENDING until something else does.
 * Status polls ping it too while a render is PENDING, so a lost ping only delays a job by one poll.
 *
 * BLITZ_WORKER_URL unset (local dev, or a worker that never sleeps) → no-op.
 */

import { after } from 'next/server';

/** A sleeping service answers the first requests with 502 while it boots; keep trying for about 1 min. */
const ATTEMPTS = 12;
const RETRY_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;
/** Status polls run every few seconds: one ping per server instance per window is enough. */
const THROTTLE_MS = 15_000;

let lastPingAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sends POST /wake until the worker answers 2xx. Never throws. */
export async function pingBlitzWorker(): Promise<void> {
  const url = process.env.BLITZ_WORKER_URL;
  if (!url) return;
  lastPingAt = Date.now();
  const secret = process.env.BLITZ_WORKER_WAKE_SECRET ?? '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(new URL('/wake', url), {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return;
      if (res.status === 401) {
        console.error('[blitz-wake] Worker refused the wake secret: check BLITZ_WORKER_WAKE_SECRET on both sides');
        return;
      }
    } catch {
      // Booting or unreachable: try again.
    }
    if (attempt < ATTEMPTS) await sleep(RETRY_MS);
  }
  console.error(`[blitz-wake] Worker did not answer after ${ATTEMPTS} attempts`);
}

/** Pings the worker after the response is sent; outside a request (scripts, tests) it runs in the background. */
export function wakeBlitzWorker(options: { throttle?: boolean } = {}): void {
  if (!process.env.BLITZ_WORKER_URL) return;
  if (options.throttle && Date.now() - lastPingAt < THROTTLE_MS) return;
  lastPingAt = Date.now();
  try {
    after(pingBlitzWorker);
  } catch {
    void pingBlitzWorker();
  }
}
