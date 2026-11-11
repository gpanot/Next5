// server-only — never import from a 'use client' file.
//
// Stock photo searches for story shots (stockImages.ts). The first words of the spoken line made poor searches: bank
// stories often have no photo prompt, so "I do not have time to log every can" searched "not have time log" and found
// firewood. One small model call per audience now turns each shot into a short visible scene ("woman checking pantry
// shelf"). A shot the model skipped, or a failed call, falls back to stockQuery.

import { chatJson } from '../../ai/openai';
import { categoryLabel } from './categories';
import type { ImageNeed } from './generatedAssets';
import type { PhotoBrand } from './shotPhotos';

/** Words of a photo description that say little about what a stock search should find. */
const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'into', 'over', 'near', 'while',
  'is', 'are', 'their', 'her', 'his', 'its', 'they', 'she', 'he', 'who', 'that', 'this', 'looking', 'photo', 'image', 'shot',
  'close', 'up', 'closeup', 'vertical', 'natural', 'light', 'bright', 'soft', 'warm', 'scene', 'background', 'one', 'two',
]);
const QUERY_WORDS = 4;

/** Fallback search from the shot's photo description (or its line): the first few telling words. */
export const stockQuery = (need: ImageNeed): string =>
  (need.photo?.description ?? need.text)
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, QUERY_WORDS)
    .join(' ');

const RULES = `You write stock photo searches (Pexels, Unsplash) for the background photos of a short vertical video.
Each photo sits behind one spoken line. A viewer must get the line from the photo.

For each shot, one search of 2-5 words: a concrete scene a camera can see, a person doing something with a thing in a
place ("woman checking pantry shelf", "man texting in grocery store", "couple unpacking groceries kitchen").
- Pick the most visible moment of the line, in the audience's world (the business and audience below).
- Only words a photo caption uses: people, actions, objects, places.
- A photo shows what is there, never what is not: for a line about something missing, run out or forgotten, show the
  person looking for it (an open fridge, an empty shelf, searching a cupboard). Never "missing", "without", "out of".
- Never: feelings, abstract words, negations, numbers, brand or app names, text, signs, posters, words with two
  meanings ("log", "list" alone).
Return JSON only, one key per shot, keys copied exactly: {"s0":"...","s1":"..."}`;

const shotLine = (key: string, need: ImageNeed) =>
  `${key} | ${need.role} shot | line: "${need.text}"${need.photo ? ` | wanted: ${need.photo.description}` : ''}${need.story ? ` | story: ${need.story.lines.slice(0, 300)}` : ''}`;

/** One call: a stock search per need, by need key. Shots the model skipped get stockQuery. Never throws. */
export async function writeStockQueries(brand: PhotoBrand, audience: string, categories: string[], needs: ImageNeed[]): Promise<Map<string, string>> {
  const out = new Map(needs.map((n) => [n.key, stockQuery(n)]));
  if (needs.length === 0) return out;
  // Flat short keys ("s0"): small models drop fields nested in objects and reword free-text keys.
  const user = [
    `BUSINESS: ${brand.business}: ${brand.sells}`,
    `AUDIENCE: ${audience}${categories.length ? ` (${categories.map(categoryLabel).join(', ')})` : ''}`,
    '',
    ...needs.map((n, i) => shotLine(`s${i}`, n)),
  ].join('\n');
  const result = await chatJson<Record<string, unknown>>(
    [{ role: 'system', content: RULES }, { role: 'user', content: user }],
    { model: 'gpt-5.4-mini', reasoningEffort: 'low', maxTokens: 2_000, timeoutMs: 30_000 },
  ).catch(() => null);
  if (!result) console.warn(`[stockQueries] ${audience}: no searches written, using the lines`);
  needs.forEach((n, i) => {
    const query = result?.[`s${i}`];
    if (typeof query === 'string' && query.trim()) out.set(n.key, query.trim().toLowerCase().replace(/[^a-z\s-]/g, '').replace(/\s+/g, ' ').slice(0, 80));
  });
  return out;
}
