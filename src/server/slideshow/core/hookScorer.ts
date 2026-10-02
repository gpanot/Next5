// server-only — never import from a 'use client' file.
// Scores finished hooks with Jev (src/server/ai/jev.ts) on a "stop scrolling" rubric; used to pick
// the best hook per archetype. Tested 2026-10-02: re-scoring gives ~0.97 rank stability,
// junk hooks score ~0.15, real hooks 0.6–0.9. Cost ~$0.00002 per hook.

import { isJevEnabled, jevScore } from '../../ai/jev';

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

/**
 * Scores each hook from 0 (scrolls past) to 1 (stops and watches).
 * Returns null when Jev is unavailable (no key, or every call failed),
 * so the caller can fall back to its own ranking. Hooks whose call failed are left out of the map.
 */
export async function scoreHooksWithJev(brief: HookScoreBrief, hooks: string[]): Promise<Map<string, number> | null> {
  const unique = [...new Set(hooks)];
  if (!isJevEnabled() || unique.length === 0) return null;

  const briefState = { ...brief, proof: brief.proof ?? 'none', platform: 'TikTok, on-screen text in first 3 seconds' };
  const instructions = `This is the opening on-screen text of a short vertical video shown to ${brief.audience}. How likely are they to stop scrolling?`;
  const results = await Promise.all(unique.map((hook) => jevScore({ brief: briefState, hook }, instructions, STOP_RUBRIC)));
  const scores = new Map<string, number>();
  unique.forEach((h, i) => {
    const s = results[i];
    if (s !== null && s !== undefined) scores.set(h, s);
  });
  return scores.size > 0 ? scores : null;
}
