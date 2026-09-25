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
  let errors: string[] = [];
  for (let attempt = 1; attempt <= MEAT_ATTEMPTS; attempt++) {
    const { result } = await chatJsonWithMeta<RawMeat>(messages, { maxTokens: 700, temperature: 0.6 });
    draft = normalizeDraft(result, proof);
    errors = checkMeatDraft(draft.meat, draft.cta, input.guard);
    if (errors.length === 0) return draft;
    console.warn(`[${input.label}] meat attempt ${attempt} failed: ${errors.join(' | ')}`);
    messages.push({
      role: 'user',
      content: `Your draft broke these rules:\n- ${errors.join('\n- ')}\nFix every one. Keep what was fine. Return the full JSON.`,
    });
  }
  const hardErrors = errors.filter((e) => !e.startsWith(LENGTH_ERROR_PREFIX));
  if (hardErrors.length > 0) throw new Error(`Could not write clean copy: ${hardErrors.join(' ')}`);
  console.warn(`[${input.label}] shipping draft with length issues for the editor: ${errors.join(' | ')}`);
  return draft;
}
