// server-only — never import from a 'use client' file.
// Fair Housing guard, both layers (docs/business-studios/15-realtor-autopilot-plan.md §5.4):
// 1. the deterministic phrase blocklist (fairHousing.ts), free and always on;
// 2. one gpt-5.4-nano read of the full text, for steering the blocklist cannot list ("quiet street, no kids around").
// Flat top-level keys only: nano drops fields nested in an object.

import { chatJson } from '../ai/openai';
import { fairHousingHits } from './fairHousing';

const MODEL = 'gpt-5.4-nano';
const MAX_FLAGS = 3;

const PROMPT = `You check US real estate social posts for Fair Housing Act problems.
Flag only wording that steers buyers by who they are: familial status (kids, families, couples, singles, retirees),
religion, race, color, national origin, sex, disability, or age; vague safety or crime claims about an area; school
quality claims; "exclusive" or restricted communities. Property facts are fine (rooms, sizes, features, distances to
parks, shops, roads, transit). Prices, market numbers and "DM VALUE"-style calls to action are fine.
Return JSON only: {"flagged":false,"phrase1":"","phrase2":"","phrase3":""} — each phraseN is the exact words to remove.`;

type NanoVerdict = { flagged?: unknown; phrase1?: unknown; phrase2?: unknown; phrase3?: unknown };

const phrasesOf = (v: NanoVerdict): string[] =>
  [v.phrase1, v.phrase2, v.phrase3].map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean).slice(0, MAX_FLAGS);

/**
 * Phrases the nano check flags in the text. An API failure returns [] (the blocklist already ran): a hiccup at
 * OpenAI must not block every post, and the blocklist covers the common phrases.
 */
export const aiFairHousingFlags = async (text: string): Promise<string[]> => {
  if (!text.trim()) return [];
  const verdict = await chatJson<NanoVerdict>(
    [
      { role: 'system', content: PROMPT },
      { role: 'user', content: text.slice(0, 6_000) },
    ],
    { model: MODEL, maxTokens: 600, reasoningEffort: 'low', timeoutMs: 20_000 },
  );
  if (!verdict) {
    console.warn('[fairHousing] nano check unavailable, blocklist only');
    return [];
  }
  if (verdict.flagged !== true) return [];
  const phrases = phrasesOf(verdict);
  return phrases.length > 0 ? phrases : ['(a phrase the checker did not name)'];
};

/** Blocked phrases in these texts: the blocklist first (free); the nano check only when the blocklist is clean. */
export const fairHousingProblems = async (texts: readonly string[]): Promise<string[]> => {
  const listed = texts.flatMap((t) => fairHousingHits(t).map((h) => h.phrase));
  if (listed.length > 0) return listed;
  return aiFairHousingFlags(texts.filter(Boolean).join('\n---\n'));
};
