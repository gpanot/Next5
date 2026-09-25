// server-only — never import from a 'use client' file.
// Few-shot patterns for hook generation, taken from the hook library (src/data/hooks.json).
// Mapping from library categories to archetypes follows spec section 7.2.

import hooksData from '../../../data/hooks.json';
import { wordCount } from './copyGuards';
import type { HookArchetype, HookFewShot } from './types';

type LibraryHook = { id: string; text: string; category: string; tier: string; engagementRate: number };

const CATEGORIES_BY_ARCHETYPE: Record<HookArchetype, string[]> = {
  call_out: ['relatable'],
  contrarian: ['bold_statement', 'controversial', 'comparison', 'confession'],
  proof_result: ['success_story', 'transformation', 'social_proof', 'authority', 'story_opener'],
  fear_inaction: ['mistake', 'statistic', 'fomo'],
  curiosity: ['curiosity_gap', 'question', 'list_promise', 'how_to', 'prediction'],
  action: ['engagement'],
};

/** Patterns longer than this cannot be filled into an 8-word on-screen hook. */
const MAX_PATTERN_WORDS = 10;

/**
 * A pattern is usable when it fits on screen, has a [slot] to fill with brief facts,
 * and carries no hard number ("97% of people", "#1 mistake") the model would copy as a fake stat.
 * First-person creator stories ("I tested...", "We increased...") are skipped: the video speaks
 * for the brand or listing, and those patterns invite made-up personal results.
 */
const isUsablePattern = (text: string): boolean =>
  !text.includes('!')
  && wordCount(text) <= MAX_PATTERN_WORDS
  && /\[[^\]]+\]/.test(text)
  && !/[\d%]/.test(text)
  && !/\b(I|I'm|I've|we|me|my|emoji)\b/i.test(text)
  // "Your competitors are already doing [X]" asserts something nobody measured.
  && !/competitor/i.test(text);

const LIBRARY = (hooksData as { hooks: LibraryHook[] }).hooks;

/**
 * Top library patterns per archetype, ranked by engagement.
 * Patterns keep their [brackets]; the prompt tells the model to fill them with brief facts.
 */
export function libraryFewShots(perArchetype = 3): HookFewShot[] {
  return (Object.keys(CATEGORIES_BY_ARCHETYPE) as HookArchetype[]).flatMap((archetype) =>
    LIBRARY
      .filter((h) => CATEGORIES_BY_ARCHETYPE[archetype].includes(h.category))
      .filter((h) => isUsablePattern(h.text))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, perArchetype)
      .map((h) => ({ archetype, text: h.text, context: 'pattern' })),
  );
}
