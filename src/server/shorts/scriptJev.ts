// server-only — never import from a 'use client' file.
// Jev's rating of each script draft as a YouTube Short (overall, hook, lesson), shown on the short's detail page.
// Not a gate: kept to monitor script quality over time (2026-10-08). In the model benchmark the spread was small
// (0.73-0.80 overall), so read it next to the script, not as a verdict.

import { jevScore } from '../ai/jev';
import type { ShortInputs, ShortScript, ShortScriptJev } from '../../types/admin/shorts';
import { stripTags } from './voice';

const QUESTIONS: Record<keyof ShortScriptJev, { instructions: string; rubric: string[] }> = {
  overall: {
    instructions: 'How good is this narration as the script of a 20-40 second educational YouTube Short for this audience?',
    rubric: ['Unusable script for a YouTube Short', 'Weak: viewers would swipe away early', 'Average short script', 'Good: clear, engaging, worth finishing', 'Excellent: viewers would watch to the end and save it'],
  },
  hook: {
    instructions: 'How strong is the opening line at stopping a scrolling viewer from this audience?',
    rubric: ['The opening line gives no reason to keep watching', 'Weak opening', 'Okay opening', 'Strong opening that names a real pain or payoff', 'Scroll-stopping opening that makes the viewer need the answer'],
  },
  lesson: {
    instructions: 'How clear, concrete and useful is the lesson, without sounding like an ad?',
    rubric: ['Teaches nothing useful; feels like an ad', 'Vague lesson', 'Some useful lesson', 'Clear lesson the viewer can apply today', 'Very clear, concrete lesson with a memorable takeaway and no selling'],
  },
};

/** The three ratings, asked in parallel (~$0.00002 each). A failed question is null. */
export const rateScript = async (script: ShortScript, inputs: ShortInputs): Promise<ShortScriptJev> => {
  const state = { platform: 'YouTube Shorts', audience: inputs.audience, script: stripTags(script.narration), on_screen_cta: script.cta ?? '' };
  const keys = Object.keys(QUESTIONS) as (keyof ShortScriptJev)[];
  const scores = await Promise.all(keys.map((k) => jevScore(state, QUESTIONS[k].instructions, QUESTIONS[k].rubric)));
  return { overall: scores[0] ?? null, hook: scores[1] ?? null, lesson: scores[2] ?? null };
};
