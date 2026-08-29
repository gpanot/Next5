/**
 * Fetches AI-generation prompts from the `prompts` table via Prisma.
 *
 * Drop-in replacement for the previous Supabase-based version — same exported
 * interface, same in-memory cache, same null-on-failure contract so callers
 * fall back to the hardcoded prompts in src/data/prompts.ts.
 *
 * Records are keyed by `{routeId}:{sceneIndex}` (e.g. "golden-saigon:0").
 * Cache TTL: 5 minutes.
 */

import { prisma, isDbConfigured } from './db';

const CACHE_TTL_MS = 5 * 60 * 1000;

type PromptMap = Map<string, string>;

let cache: PromptMap | null = null;
let cacheAt = 0;

async function fetchAllPrompts(): Promise<PromptMap> {
  const rows = await prisma.prompt.findMany({
    where: { isActive: true },
    select: { routeId: true, sceneIndex: true, prompt: true },
  });

  const map: PromptMap = new Map();
  for (const row of rows) {
    map.set(`${row.routeId}:${row.sceneIndex}`, row.prompt);
  }
  return map;
}

export async function getSupabasePrompts(): Promise<PromptMap | null> {
  if (!isDbConfigured()) return null;

  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;

  try {
    cache = await fetchAllPrompts();
    cacheAt = now;
    return cache;
  } catch (err) {
    console.warn('[db-prompts] Failed to fetch prompts, falling back to hardcoded:', err);
    return null;
  }
}

export async function getSupabasePrompt(
  routeId: string,
  sceneIndex: number,
): Promise<string | null> {
  const prompts = await getSupabasePrompts();
  return prompts?.get(`${routeId}:${sceneIndex}`) ?? null;
}

export { getSupabasePrompts as getAirtablePrompts, getSupabasePrompt as getAirtablePrompt };
