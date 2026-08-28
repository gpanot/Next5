/**
 * Fetches AI-generation prompts from the Airtable "Prompts" table at runtime.
 *
 * - Records are keyed by `{routeId}:{sceneIndex}` (e.g. "golden-saigon:0").
 * - Results are cached in-memory for `CACHE_TTL_MS` so every request doesn't
 *   hit Airtable (Next.js serverless functions are ephemeral, so TTL just
 *   throttles rapid consecutive calls within a warm instance).
 * - If the table is not configured or the fetch fails, callers receive `null`
 *   and should fall back to the hardcoded prompts in src/data/prompts.ts.
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_PROMPTS_TABLE_ID = process.env.AIRTABLE_PROMPTS_TABLE_ID;

/** Cache duration: 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

type PromptMap = Map<string, string>;

let cache: PromptMap | null = null;
let cacheAt = 0;

function isConfigured(): boolean {
  return !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID && AIRTABLE_PROMPTS_TABLE_ID);
}

type AirtableRecord = {
  id: string;
  fields: {
    'Route ID'?: string;
    'Scene'?: number;
    'Prompt'?: string;
  };
};

async function fetchAllPrompts(): Promise<PromptMap> {
  const map: PromptMap = new Map();
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROMPTS_TABLE_ID!)}`,
    );
    url.searchParams.set('fields[]', 'Route ID');
    url.searchParams.append('fields[]', 'Scene');
    url.searchParams.append('fields[]', 'Prompt');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      // Prevent Next.js from caching this at the fetch layer so we control TTL ourselves
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Airtable fetch failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };

    for (const record of data.records) {
      const routeId = record.fields['Route ID'];
      const scene = record.fields['Scene'];
      const prompt = record.fields['Prompt'];
      if (routeId && scene !== undefined && prompt) {
        map.set(`${routeId}:${scene}`, prompt);
      }
    }

    offset = data.offset;
  } while (offset);

  return map;
}

/**
 * Returns the full prompt map from Airtable (cached).
 * Returns `null` if Airtable is not configured or if the fetch fails.
 */
export async function getAirtablePrompts(): Promise<PromptMap | null> {
  if (!isConfigured()) return null;

  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  try {
    cache = await fetchAllPrompts();
    cacheAt = now;
    return cache;
  } catch (err) {
    console.warn('[airtable-prompts] Failed to fetch prompts, falling back to hardcoded:', err);
    return null;
  }
}

/**
 * Looks up a single prompt from the Airtable cache.
 * Returns `null` on any failure (caller should use hardcoded fallback).
 */
export async function getAirtablePrompt(
  routeId: string,
  sceneIndex: number,
): Promise<string | null> {
  const prompts = await getAirtablePrompts();
  return prompts?.get(`${routeId}:${sceneIndex}`) ?? null;
}
