// server-only — never import from a 'use client' file.
// Format + guardrail checks shared by both engines. Each engine passes its own line guard
// (numbers from its source, Fair Housing or claim rules, filler).

import { wordCount, wordOverlap } from './copyGuards';
import { INACTION_BRIDGE_PATTERN, SHOT_BY_ROLE } from './format';
import type { MeatLines } from './types';

/** Returns why one line breaks an engine rule, or null when it is clean. */
export type LineGuard = (text: string) => string | null;

/** Marks errors that only concern length: the user can still fix those in the editor. */
export const LENGTH_ERROR_PREFIX = 'Too long: ';

/** Max share of content words Shot 6 may share with the Pain line (spec 8.3). */
const INACTION_PAIN_MAX_OVERLAP = 0.4;

const MEAT_ROLES = [
  ['pain', 'pain'], ['oldWay', 'old_way'], ['mechanism', 'mechanism'],
  ['proof', 'proof'], ['inaction', 'inaction'],
] as const;

const SHOT_ORDER = ['hook', 'pain', 'old_way', 'mechanism', 'proof', 'inaction', 'cta'] as const;

/** All problems with a meat + CTA draft, phrased as fix instructions for the retry prompt. */
export function checkMeatDraft(meat: Omit<MeatLines, 'cta'>, cta: string, guard: LineGuard): string[] {
  const errors: string[] = [];
  const lines: Array<[string, string, number]> = [
    ...MEAT_ROLES.map(([key, role]) => [key, meat[key] ?? '', SHOT_BY_ROLE[role].maxWords] as [string, string, number]),
    ['cta', cta, SHOT_BY_ROLE.cta.maxWords],
  ];

  for (const [key, text, max] of lines) {
    if (!text.trim()) { errors.push(`${key} is empty.`); continue; }
    const n = wordCount(text);
    if (n > max) errors.push(`${LENGTH_ERROR_PREFIX}${key} "${text}" has ${n} words; rewrite it in ${max} words or fewer.`);
    const reason = guard(text);
    if (reason) errors.push(`${key}: ${reason}.`);
  }

  const inaction = (meat.inaction ?? '').trim();
  if (inaction && !INACTION_BRIDGE_PATTERN.test(inaction)) {
    errors.push('inaction must end with a colon ":" that the CTA answers.');
  }
  if (inaction && wordOverlap(inaction, meat.pain ?? '') > INACTION_PAIN_MAX_OVERLAP) {
    errors.push('inaction repeats the pain line. State the cost of waiting, then the bridge.');
  }
  return errors;
}

/**
 * Re-checks a card after the user edited it: format (count, word limits, no "!" on the hook,
 * bridge colon) and the engine's guard. Returns readable problems; empty = ok to render.
 */
export function checkShotTexts(texts: string[], guard: LineGuard): string[] {
  if (texts.length !== SHOT_ORDER.length) return [`A deck video has ${SHOT_ORDER.length} shots, got ${texts.length}.`];
  const problems: string[] = [];
  SHOT_ORDER.forEach((role, i) => {
    const def = SHOT_BY_ROLE[role];
    const text = texts[i]!.trim();
    if (!text) { problems.push(`${def.label}: empty.`); return; }
    const n = wordCount(text);
    if (n > def.maxWords) problems.push(`${def.label}: ${n} words, max ${def.maxWords}.`);
    if (role === 'hook' && text.includes('!')) problems.push('Hook: remove "!".');
    const reason = guard(text);
    if (reason) problems.push(`${def.label}: ${reason}.`);
  });
  if (!INACTION_BRIDGE_PATTERN.test(texts[5]!.trim())) {
    problems.push(`${SHOT_BY_ROLE.inaction.label}: end with ":" so the CTA answers it.`);
  }
  return problems;
}
