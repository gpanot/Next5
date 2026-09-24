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
  results: Array<{ text?: string; title?: string; url?: string }>;
}

export interface ExaSearchResponse {
  results: Array<{ title?: string; url?: string }>;
}

/** Crawl a URL and return up to `maxCharacters` chars of cleaned text. */
export async function crawlPage(url: string, maxCharacters = 3_500): Promise<{ text: string | null; durationMs: number }> {
  const t0 = Date.now();
  const data = await exaFetch<ExaContentsResponse>('/contents', {
    urls: [url],
    text: { maxCharacters },
    livecrawlTimeout: 15_000,
  });
  return { text: data?.results?.[0]?.text ?? null, durationMs: Date.now() - t0 };
}
