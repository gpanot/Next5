// server-only — never import from a 'use client' file.
// Jev (typesafe/jev-1.13) through the OpenRouter Decisions API. It does not write text: it answers typed questions
// about a state with calibrated probabilities. Used to rank hooks and to match music. ~$0.00002 per small call.

const DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';
const JEV_MODEL = 'typesafe/jev-1.13';
const TIMEOUT_MS = 10_000;

type ScoreAnswer = { type: 'score'; score: number };
type DecisionResponse = { answers?: Record<string, ScoreAnswer | undefined> };

export const isJevEnabled = (): boolean => Boolean(process.env.OPENROUTER_API_KEY);

/**
 * Asks one "score" question about `state`; returns the position on `rubric` scaled to 0..1.
 * Null on any failure (no key, HTTP error, timeout), so callers keep their own fallback.
 */
export async function jevScore(state: unknown, instructions: string, rubric: string[]): Promise<number | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(DECISIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Next5' },
      body: JSON.stringify({ model: JEV_MODEL, state, questions: { q: { type: 'score', instructions, criteria: rubric } } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const score = ((await res.json()) as DecisionResponse).answers?.q?.score;
    return typeof score === 'number' ? score / (rubric.length - 1) : null;
  } catch {
    return null;
  }
}
