// server-only — never import from a 'use client' file.
// Thin Apify REST client shared by the TikTok Shop import and the Zillow listing import.

export const APIFY_API = 'https://api.apify.com/v2';

export type ApifyRow = Record<string, unknown>;
export type RunState = { status: 'running' | 'succeeded' | 'failed'; datasetId: string | null; message: string | null; costUsd?: number };

/** Raised for a non-2xx Apify response, so callers can react to a status (402 = account memory cap). */
export class ApifyError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const token = (): string => {
  const t = process.env.APIFY_TOKEN;
  if (!t) throw new Error('APIFY_TOKEN is not set');
  return t;
};

export const apifyCall = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new ApifyError(res.status, `Apify ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
};

/** `&webhooks=…` query part so Apify calls us when the run ends, or '' without a webhook URL. */
export const webhooksParam = (webhookUrl: string | null): string =>
  webhookUrl
    ? `&webhooks=${Buffer.from(JSON.stringify([{ eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED', 'ACTOR.RUN.TIMED_OUT'], requestUrl: webhookUrl }])).toString('base64')}`
    : '';

/** Our webhook endpoint, only on a public https app with a secret set. */
export const apifyWebhookUrl = (): string | null => {
  const app = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  return app.startsWith('https://') && secret ? `${app.replace(/\/$/, '')}/api/webhooks/apify?secret=${encodeURIComponent(secret)}` : null;
};

export const getApifyRun = async (runId: string): Promise<RunState> => {
  const { data } = await apifyCall<{ data: { status: string; defaultDatasetId: string; statusMessage?: string; usageTotalUsd?: number } }>(`${APIFY_API}/actor-runs/${runId}`);
  const status = data.status === 'SUCCEEDED' ? 'succeeded' : ['FAILED', 'ABORTED', 'TIMED-OUT'].includes(data.status) ? 'failed' : 'running';
  return { status, datasetId: data.defaultDatasetId ?? null, message: data.statusMessage ?? null, costUsd: data.usageTotalUsd ?? undefined };
};

export const getApifyDataset = (datasetId: string): Promise<ApifyRow[]> =>
  apifyCall<ApifyRow[]>(`${APIFY_API}/datasets/${datasetId}/items?clean=1&format=json`);
