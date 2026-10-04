// server-only — never import from a 'use client' file.
// The story-writing loop shared by both engines: one prompt → levers + 5 story lines + CTA,
// checked by the engine's rules, retried with the errors as fix instructions.

import { chatJsonWithMeta } from '../../ai/openai';
import { LENGTH_ERROR_PREFIX, checkMeatDraft, type LineGuard } from './meatCheck';
import type { MeatLines, ProofPoint, ValueLevers } from './types';

export type MeatDraft = { levers: ValueLevers; meat: MeatLines; cta: string };

type RawMeat = { levers?: Partial<ValueLevers>; meat?: Partial<MeatLines>; cta?: string };

/** 1 call + up to 2 retries with the validator's errors. */
const MEAT_ATTEMPTS = 3;
/** Empty replies (the model ran out of tokens) are asked again without using up an attempt, this many times. */
const EMPTY_RETRIES = 2;
/** gpt-5.x reasoning tokens count against this: 700 left nothing for the JSON on retries (empty content, "length"). */
const MEAT_MAX_TOKENS = 3000;

/** The retry message: the model's own draft (so "keep what was fine" means something) and what to fix. */
function fixMessage(draft: MeatDraft, errors: string[]): string {
  const numbers = errors.some((e) => e.includes('is not on the website') || e.includes('is not in the listing'));
  return [
    `Your draft:\n${JSON.stringify({ levers: draft.levers, meat: draft.meat, cta: draft.cta })}`,
    `It broke these rules:\n- ${errors.join('\n- ')}`,
    numbers ? 'For a number that is not in the profile: rewrite that line with no number at all (no digits, no number words).' : '',
    'Fix every one. Keep what was fine. Return the full JSON.',
  ].filter(Boolean).join('\n\n');
}

function normalizeDraft(raw: RawMeat | null, proofPoints: ProofPoint[]): MeatDraft {
  const m = raw?.meat ?? {};
  // The model sometimes nests cta inside meat; accept both.
  const cta = (raw?.cta ?? m.cta ?? '').trim();
  return {
    levers: {
      dreamOutcome: raw?.levers?.dreamOutcome ?? '',
      oldWay: raw?.levers?.oldWay ?? '',
      namedMechanism: raw?.levers?.namedMechanism ?? '',
      timeToFirstWin: raw?.levers?.timeToFirstWin,
      effortAvoided: raw?.levers?.effortAvoided,
      // Proof is never taken from the model: only the engine's verified source.
      proofPoints,
    },
    meat: {
      pain: (m.pain ?? '').trim(),
      oldWay: (m.oldWay ?? '').trim(),
      mechanism: (m.mechanism ?? '').trim(),
      proof: (m.proof ?? '').trim(),
      inaction: (m.inaction ?? '').trim(),
      cta,
    },
    cta,
  };
}

export type WriteMeatInput = {
  /** Engine name for logs and errors. */
  label: string;
  systemPrompt: string;
  guard: LineGuard;
  proofPoints?: ProofPoint[];
};

/**
 * Writes the story, checks it, and retries with the errors. Facts and safety are hard stops
 * (throws). A line a word or two long is not: the editor shows the live count and blocks render.
 */
export async function writeMeatWithRetries(input: WriteMeatInput): Promise<MeatDraft> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: 'Write the JSON now.' },
  ];
  const proof = input.proofPoints ?? [];

  let draft = normalizeDraft(null, proof);
  let errors: string[] = ['no draft'];
  let empties = 0;
  for (let attempt = 1; attempt <= MEAT_ATTEMPTS; attempt++) {
    const { result } = await chatJsonWithMeta<RawMeat>(messages, { maxTokens: MEAT_MAX_TOKENS, temperature: 0.6, model: 'gpt-5.5', reasoningEffort: 'low', timeoutMs: 45_000 });
    if (!result && empties < EMPTY_RETRIES) {
      empties += 1;
      attempt -= 1;
      console.warn(`[${input.label}] meat reply was empty, asking again`);
      continue;
    }
    draft = normalizeDraft(result, proof);
    errors = checkMeatDraft(draft.meat, draft.cta, input.guard);
    if (errors.length === 0) return draft;
    console.warn(`[${input.label}] meat attempt ${attempt} failed: ${errors.join(' | ')}`);
    messages.push({ role: 'user', content: fixMessage(draft, errors) });
  }
  const hardErrors = errors.filter((e) => !e.startsWith(LENGTH_ERROR_PREFIX));
  if (hardErrors.length > 0) throw new Error(`Could not write clean copy: ${hardErrors.join(' ')}`);
  console.warn(`[${input.label}] shipping draft with length issues for the editor: ${errors.join(' | ')}`);
  return draft;
}
