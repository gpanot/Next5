// server-only — never import from a 'use client' file.
// Maps a brief's audience ("auto mechanics", "busy parents") to industry categories, so story
// shots come from footage of their world. Cached per process: the same IDC recurs across decks.

import { chatJson } from '../../ai/openai';
import { ASSET_CATEGORIES, categoryMenu, cleanCategories } from './categories';

/** Word stems of a text ("Auto mechanics" → ["auto", "mechan"]). */
const stems = (text: string): string[] =>
  text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 6));

/** Categories whose label or slug names the audience directly ("electricians", "Dental clinics"). */
function directMatch(audience: string): string[] {
  const words = stems(audience);
  return ASSET_CATEGORIES
    .filter((c) => c.slug !== 'general')
    .filter((c) => stems(`${c.label} ${c.slug.replace(/_/g, ' ')}`).some((s) => words.includes(s)))
    .map((c) => c.slug)
    .slice(0, 2);
}

const cache = new Map<string, string[]>();

/**
 * 1–2 industry categories for an audience (never 'general'); [] when none fits.
 * Only the audience itself is classified: passing the business's pitch ("for mechanics and
 * electricians") made the model tag every audience with every industry the business serves.
 */
export async function categoriesForAudience(audience: string): Promise<string[]> {
  const key = audience.toLowerCase().trim();
  const hit = cache.get(key);
  if (hit) return hit;
  // Name match first: deterministic, and the LLM sometimes returns [] for obvious trades.
  const direct = directMatch(audience);
  if (direct.length) {
    cache.set(key, direct);
    return direct;
  }
  const result = await chatJson<{ categories?: unknown }>(
    [
      {
        role: 'system',
        content: `Pick the 1 or 2 industry categories whose FOOTAGE shows THIS audience's own workday.
Categories:
${categoryMenu()}
Never pick "general". Return JSON only: { "categories": ["slug"] } ([] if none fits).`,
      },
      { role: 'user', content: `Audience: ${audience}` },
    ],
    { maxTokens: 60, temperature: 0 },
  );
  const cats = cleanCategories(result?.categories, 2).filter((c) => c !== 'general');
  cache.set(key, cats);
  return cats;
}
