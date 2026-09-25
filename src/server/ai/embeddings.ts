// server-only — never import from a 'use client' file.
// Text embeddings for semantic asset search (pgvector column asset_descriptors.embedding).

/** OpenAI text-embedding-3-small: 1536 dims, matches the vector(1536) column. */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMS = 1536;

/** OpenAI caps one request at 2048 inputs; smaller batches keep failures cheap. */
const BATCH_SIZE = 100;
const TIMEOUT_MS = 20_000;

/** Query texts repeat a lot across cards and decks (same hook intents): cache them in-process. */
const queryCache = new Map<string, number[]>();
const QUERY_CACHE_MAX = 2_000;

async function embedBatch(texts: string[]): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('[embeddings] OPENAI_API_KEY is not set');
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, dimensions: EMBEDDING_DIMS }),
    });
    if (!res.ok) {
      console.error(`[embeddings] OpenAI returned ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { data?: Array<{ index: number; embedding: number[] }> };
    const rows = [...(data.data ?? [])].sort((a, b) => a.index - b.index);
    return rows.length === texts.length ? rows.map((r) => r.embedding) : null;
  } catch (err) {
    console.error('[embeddings] request failed:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Embeds many texts, in batches. Null when any batch fails (callers fall back to keyword search). */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = await embedBatch(texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 8_000)));
    if (!batch) return null;
    out.push(...batch);
  }
  return out;
}

/** Embeds search queries with an in-process cache. Returns null entries when embedding failed. */
export async function embedQueries(texts: string[]): Promise<Array<number[] | null>> {
  const missing = [...new Set(texts.filter((t) => !queryCache.has(t)))];
  if (missing.length > 0) {
    const vectors = await embedTexts(missing);
    vectors?.forEach((v, i) => {
      if (queryCache.size >= QUERY_CACHE_MAX) queryCache.delete(queryCache.keys().next().value!);
      queryCache.set(missing[i]!, v);
    });
  }
  return texts.map((t) => queryCache.get(t) ?? null);
}

/** pgvector literal: '[0.1,0.2,…]'. */
export const toVectorLiteral = (v: number[]): string => `[${v.join(',')}]`;
