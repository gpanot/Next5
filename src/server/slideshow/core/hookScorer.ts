// server-only — never import from a 'use client' file.
// Scores finished hooks with Jev (typesafe/jev-1.13 via the OpenRouter Decisions API).
// Jev returns a calibrated position on a "stop scrolling" rubric; we use it to pick
// the best hook per archetype. Tested 2026-10-02: re-scoring gives ~0.97 rank stability,
// junk hooks score ~0.15, real hooks 0.6–0.9. Cost ~$0.00002 per hook.

const DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';
const JEV_MODEL = 'typesafe/jev-1.13';
const TIMEOUT_MS = 10_000;

const STOP_RUBRIC = [
  'Scrolls past instantly',
  'Glances, keeps scrolling',
  'Pauses briefly',
  'Stops and reads',
  'Stops, watches, feels it is about them',
];

/** Brief facts Jev reads next to each hook. */
export type HookScoreBrief = {
  audience: string;
  lensLine?: string;
  pain: string;
  dreamOutcome: string;
  mechanism: string;
  proof: string | null;
};

type ScoreAnswer = { type: 'score'; score: number };
type DecisionResponse = { answers?: { stop?: ScoreAnswer }; usage?: { cost?: number } };

async function scoreOne(brief: HookScoreBrief, hook: string, apiKey: string): Promise<number | null> {
  const res = await fetch(DECISIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Next5' },
    body: JSON.stringify({
      model: JEV_MODEL,
      state: { brief: { ...brief, proof: brief.proof ?? 'none', platform: 'TikTok, on-screen text in first 3 seconds' }, hook },
      questions: {
        stop: {
          type: 'score',
          instructions: `This is the opening on-screen text of a short vertical video shown to ${brief.audience}. How likely are they to stop scrolling?`,
          criteria: STOP_RUBRIC,
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as DecisionResponse;
  const score = json.answers?.stop?.score;
  return typeof score === 'number' ? score / (STOP_RUBRIC.length - 1) : null;
}

/**
 * Scores each hook from 0 (scrolls past) to 1 (stops and watches).
 * Returns null when Jev is unavailable (no key, or every call failed),
 * so the caller can fall back to its own ranking. Hooks whose call failed are left out of the map.
 */
export async function scoreHooksWithJev(brief: HookScoreBrief, hooks: string[]): Promise<Map<string, number> | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const unique = [...new Set(hooks)];
  if (!apiKey || unique.length === 0) return null;

  const results = await Promise.all(
    unique.map((h) => scoreOne(brief, h, apiKey).catch(() => null)),
  );
  const scores = new Map<string, number>();
  unique.forEach((h, i) => {
    const s = results[i];
    if (s !== null) scores.set(h, s);
  });
  return scores.size > 0 ? scores : null;
}
