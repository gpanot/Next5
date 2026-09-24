/**
 * Campaign Studio — shared Exa API client.
 * Raw fetch, no SDK (matches the rest of the codebase's Exa usage).
 */
// server-only

export async function exaFetch<T>(endpoint: string, body: object): Promise<T | null> {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    console.warn(`[studio/exa] EXA_API_KEY not set — skipping Exa ${endpoint}`);
    return null;
  }
  const t0 = Date.now();
  console.log(`[studio/exa] ${endpoint} →`, JSON.stringify(body).slice(0, 160));
  try {
    const res = await fetch(`https://api.exa.ai${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[studio/exa] ${endpoint} HTTP ${res.status} in ${Date.now() - t0}ms`);
      return null;
    }
    const data = (await res.json()) as T;
    console.log(`[studio/exa] ${endpoint} OK in ${Date.now() - t0}ms`);
    return data;
  } catch (err) {
    console.error(`[studio/exa] ${endpoint} FAILED in ${Date.now() - t0}ms:`, err);
    return null;
  }
}

export interface ExaContentsResponse {
  results: Array<{ id?: string; text?: string; title?: string; url?: string; extras?: { links?: string[] } }>;
}

/** Exa /contents: ~$0.001 per page. Rough, for run-cost telemetry only. */
export const EXA_CONTENTS_COST_MICROS = 1_000;

/**
 * Crawl several URLs in one Exa call. Returns text (and, with `links`, the page's hrefs) per
 * requested URL, in request order. Pages Exa could not fetch come back with text null
 * (Exa can return HTTP 200 with per-URL errors).
 */
export async function crawlPages(
  urls: string[],
  opts: { maxCharacters?: number; links?: number } = {},
): Promise<Array<{ url: string; text: string | null; links: string[] }>> {
  if (urls.length === 0) return [];
  const data = await exaFetch<ExaContentsResponse>('/contents', {
    urls,
    text: { maxCharacters: opts.maxCharacters ?? 3_500 },
    livecrawlTimeout: 15_000,
    ...(opts.links ? { extras: { links: opts.links } } : {}),
  });
  const byUrl = new Map<string, { text: string; links: string[] }>();
  for (const r of data?.results ?? []) {
    if (!r.text) continue;
    const entry = { text: r.text, links: r.extras?.links ?? [] };
    if (r.id) byUrl.set(r.id, entry);
    if (r.url) byUrl.set(r.url, entry);
  }
  return urls.map((url) => {
    const hit = byUrl.get(url);
    return { url, text: hit?.text ?? null, links: hit?.links ?? [] };
  });
}

export interface ExaSearchResponse {
  results: Array<{ title?: string; url?: string }>;
}
