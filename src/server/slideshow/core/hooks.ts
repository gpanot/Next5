// server-only — never import from a 'use client' file.
// Hook generation: one LLM call produces 18 hooks per brief; a filter keeps the best 1 per archetype → 6 hooks.

import { chatJsonWithMeta } from '../../ai/openai';
import { contentWords, findSlopPhrase, wordCount, wordOverlap } from './copyGuards';
import { libraryFewShots } from './hookLibrary';
import { HOOK_ARCHETYPES } from './types';
import type { HookArchetype, HookRules, Issue, ValueLevers } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HookCandidate = {
  archetype: HookArchetype;
  text: string;
};

export type HookGenerationInput = {
  briefId: string;
  /** Audience description — "Electricians" or "Buyers in Austin under $600k". */
  audience: string;
  pain: string;
  dreamOutcome: string;
  proofLine: string | null;
  /** The brief's lens in one line: angle + its fact (zillow) or IDC evidence (website). */
  lensLine?: string;
  rules: HookRules;
  levers: ValueLevers;
};

export type HookGenerationResult = {
  kept: HookCandidate[];       // 6 (fewer only when nothing valid exists at all)
  all: HookCandidate[];        // all 18 generated
  fallbackApplied: boolean;
};

/** On-screen hook limit (spec 3.1). Slideshow hooks are never spoken, so no UGC allowance here. */
const HOOK_MAX_WORDS = 8;
/** Two hooks sharing more than this share of content words count as the same hook. */
const DEDUP_OVERLAP = 0.4;

// ── System prompt ─────────────────────────────────────────────────────────────

const ARCHETYPE_DESCRIPTIONS: Record<HookArchetype, string> = {
  call_out:      'Name the audience plus one filter (place, budget, need). They must think "that is me".',
  contrarian:    'Flip one belief the audience holds, using a fact from the brief. Not a hot take about the market.',
  proof_result:  'Lead with the result or the hard facts first. Numbers from PROOF only.',
  fear_inaction: 'Name what they lose by scrolling past. Use the brief\'s urgency fact, never a made-up deadline.',
  curiosity:     'Open a loop the video closes: tease one concrete thing shown later. Never vague ("you won\'t believe").',
  action:        'Ask for one action: send, save, or comment. Tie it to the audience or place.',
};

function buildSystemPrompt(input: HookGenerationInput): string {
  const { audience, pain, dreamOutcome, proofLine, lensLine, rules, levers } = input;
  const fewShots = [...libraryFewShots(), ...rules.fewShots];

  const archetypeBlocks = HOOK_ARCHETYPES
    .filter((a) => !rules.droppedArchetypes?.includes(a))
    .map((a) => {
      const patterns = fewShots.filter((f) => f.archetype === a && f.context === 'pattern').map((f) => `"${f.text}"`);
      const examples = fewShots.filter((f) => f.archetype === a && f.context !== 'pattern').map((f) => `"${f.text}"`);
      return [
        `[${a}]`,
        `  Goal: ${ARCHETYPE_DESCRIPTIONS[a]}`,
        patterns.length ? `  Proven patterns (fill the [brackets] with brief facts): ${patterns.join(', ')}` : '',
        examples.length ? `  Examples for this brief: ${examples.join(', ')}` : '',
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');

  return `You write scroll-stopping hooks for short vertical videos. Write 3 hooks per archetype.

BRIEF
- Audience: ${audience}
${lensLine ? `- Lens: ${lensLine}\n` : ''}- Pain: ${pain}
- Dream outcome: ${dreamOutcome}
- Mechanism: ${levers.namedMechanism}
- Proof: ${proofLine ?? 'none. Do not invent any.'}

HARD RULES (a hook that breaks one is thrown away):
1. Max ${HOOK_MAX_WORDS} words. Count them.
2. No "!" and no emojis.
3. Specific: name the audience, the place, a real number from PROOF, or the concrete feature. Generic hooks fail.
4. Only facts from the brief. No invented numbers, dates, deadlines or claims.
5. Plain words a 9-year-old reads out loud. No hype words: stunning, dream, hidden gem, must-see, won't last.
6. The 3 hooks of one archetype must say different things, not the same line reworded.
${rules.extraInstruction ? `7. ${rules.extraInstruction}\n` : ''}
ARCHETYPES
${archetypeBlocks}

OUTPUT: JSON only.
{ "hooks": [ { "archetype": "<archetype id in brackets above>", "text": "<hook>" } ] }`;
}

// ── Filter: 18 → 6 ───────────────────────────────────────────────────────────

/** Lowercased terms that make a hook specific to this brief. */
function specificTerms(audience: string, rules: HookRules): string[] {
  const audienceWords = [...contentWords(audience)].filter((w) => w.length > 3);
  return [...audienceWords, ...(rules.specifics ?? [])]
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);
}

/** Specificity heuristic: a number, and each brief-specific term, adds to the score. */
function specificityScore(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  const termHits = terms.filter((t) => lower.includes(t)).length;
  return (/\d/.test(text) ? 2 : 0) + termHits;
}

/** Returns why a hook fails, or null when it passes every check (spec 7.3, steps 1 to 4). */
function rejectReason(hook: HookCandidate, terms: string[], rules: HookRules): string | null {
  const t = hook.text.trim();
  if (!t) return 'empty';
  if (t.includes('!')) return 'exclamation';
  if (wordCount(t) > HOOK_MAX_WORDS) return `${wordCount(t)} words`;
  const slop = findSlopPhrase(t);
  if (slop) return `slop "${slop}"`;
  if (specificityScore(t, terms) === 0) return 'why-care: nothing specific';
  return rules.guard?.(t) ?? null;
}

type FilterResult = { kept: HookCandidate[]; fallbackApplied: boolean };

/** Keep the best valid hook per archetype; fill empty or dropped slots from fear/curiosity (spec 7.4). */
function filterHooks(candidates: HookCandidate[], audience: string, rules: HookRules): FilterResult {
  const terms = specificTerms(audience, rules);
  const valid = candidates.filter((h) => {
    const reason = rejectReason(h, terms, rules);
    if (reason) console.log(`  [hooks] ❌ ${reason}: "${h.text}"`);
    return !reason;
  });
  const ranked = [...valid].sort((a, b) => specificityScore(b.text, terms) - specificityScore(a.text, terms));
  const isDuplicate = (h: HookCandidate, kept: HookCandidate[]) =>
    kept.some((k) => wordOverlap(k.text, h.text) > DEDUP_OVERLAP);

  const kept: HookCandidate[] = [];
  const missing: HookArchetype[] = [];
  for (const archetype of HOOK_ARCHETYPES) {
    const dropped = rules.droppedArchetypes?.includes(archetype);
    const best = dropped ? undefined : ranked.find((h) => h.archetype === archetype && !isDuplicate(h, kept));
    if (best) kept.push(best);
    else missing.push(archetype);
  }

  // Fallback keeps the hook's real archetype, so the card tag never lies about its style.
  for (let i = 0; i < missing.length; i++) {
    const extra = ranked.find(
      (h) => (h.archetype === 'fear_inaction' || h.archetype === 'curiosity')
        && !kept.includes(h) && !isDuplicate(h, kept),
    );
    if (extra) kept.push(extra);
  }

  return { kept, fallbackApplied: missing.length > 0 };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate 18 hooks for a brief via one LLM call, then filter to at most 6
 * (one per archetype). Returns the kept hooks and all generated candidates.
 */
export async function generateHooks(input: HookGenerationInput): Promise<HookGenerationResult> {
  console.log(`\n🪝 [HookGen] briefId="${input.briefId}" audience="${input.audience}" lens="${input.lensLine ?? ''}"`);

  const ask = () => chatJsonWithMeta<{ hooks: HookCandidate[] }>(
    [
      { role: 'system', content: buildSystemPrompt(input) },
      { role: 'user',   content: 'Generate the hooks JSON now.' },
    ],
    { maxTokens: 2000, temperature: 0.9, model: 'gpt-4o-mini' },
  );
  // One retry when the call fails or returns no hooks list (seen occasionally).
  let { result } = await ask();
  if (!Array.isArray(result?.hooks) || result.hooks.length === 0) ({ result } = await ask());

  const all: HookCandidate[] = (result?.hooks ?? [])
    .map((h) => ({
      // The LLM sometimes echoes archetype ids in uppercase.
      archetype: (typeof h?.archetype === 'string' ? h.archetype.toLowerCase() : '') as HookArchetype,
      text: typeof h?.text === 'string' ? h.text.trim() : '',
    }))
    .filter((h) => h.text.length > 0 && HOOK_ARCHETYPES.includes(h.archetype));

  console.log(`   LLM returned ${all.length} hooks`);
  if (all.length === 0) console.warn(`[HookGen] unusable model output: ${JSON.stringify(result).slice(0, 300)}`);
  const { kept, fallbackApplied } = filterHooks(all, input.audience, input.rules);
  console.log(`   → kept ${kept.length}${fallbackApplied ? ' (fallback applied)' : ''}:`);
  kept.forEach((h) => console.log(`     ✅ [${h.archetype}] "${h.text}"`));

  return { kept, all, fallbackApplied };
}

// ── Validation issues from hook step ─────────────────────────────────────────

/** Returns issues if fewer than 6 hooks were kept. */
export function validateHookResult(result: HookGenerationResult, expectedCount = 6): Issue[] {
  const issues: Issue[] = [];
  if (result.kept.length < expectedCount) {
    issues.push({
      level: 'warning',
      code: 'FEWER_HOOKS_THAN_EXPECTED',
      message: `Expected ${expectedCount} hooks, only kept ${result.kept.length}. Some archetypes had no valid candidates.`,
    });
  }
  return issues;
}
