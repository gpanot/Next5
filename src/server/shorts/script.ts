// server-only — never import from a 'use client' file.
// The short's narration: bank hook → 2-4 "why" lines → payoff that repeats a hook word (so the video loops).
// Prompt ported from reels-af compose.py (github.com/Agent-Field/reels-af, general mode), plus the brand block of the
// 2026-10-06 test batch the user preferred: brand tone, the bank hook verbatim, brand facts only.

import type { CostMeter } from '../metaAds/cost';
import type { ShortInputs, ShortScript } from '../../types/admin/shorts';
import { creativeJson, SCRIPT_MODEL } from './llm';
import { stripTags } from './voice';

const TAG_VOCAB = `  ALLOWED (use ≤3 total across the whole narration):
    • [curious]   — at the cold open, ONCE
    • [emphasis]  — on the single most surprising word, ONCE
    • [confident] — at the payoff, ONCE (optional)

  BANNED — do NOT use any of these. They insert real silence and blow the engagement budget:
    • [pause] [pause short] [pause long] [breath]
    • [slow] [building] [thoughtful] [wonder] [skeptical]
    • [serious] [warm] [whispers] [quiet] [intense] [hopeful]
    • Any other tag that slows delivery

  Trust the punctuation (commas, em-dashes, periods) for rhythm. Less is more.`;

const SYSTEM = `You are writing a 25-second vertical reel narration.

The structure is FIXED. Do not deviate.

  1. HOOK            — 6-10 spoken words. Picks ONE variant from:
                       shock_stat | contrarian | authority | curiosity_gap | listicle
                       For general content prefer shock_stat, contrarian, or curiosity_gap.

  2. MECHANISM       — 2-4 sentences that explain the WHY behind the hook.
                       Each sentence is a coherent visual beat downstream (one shot per sentence), so each must stand
                       alone. Names, numbers, specific things — not vibes. At most 2 numbers or prices per
                       sentence — a spoken list of prices is noise.

  3. PAYOFF + LOOP   — 1 closing sentence. The last 4-8 words MUST echo a distinctive word from your HOOK: a noun, a
                       number, or a named entity — NOT a stopword (not "the", "and", "that", "this", "you"). This is
                       how the viewer loops back to the start.

REGISTER: CONVERSATIONAL register. Audience is general scrolling viewers. Plain language; second person where natural.
No jargon without a one-clause translation. TIGHT sentences — no padding.

TOTAL LENGTH: 55-62 words. The reel lands at ~20-22s. FAST delivery — every pause is attention you've lost.

──── INLINE TTS TAGS — STRICTLY LIMITED ────
The "narration" field is passed VERBATIM to a TTS engine. Tags go in [square brackets] BEFORE the clause they modify.
${TAG_VOCAB}

PUNCTUATION DISCIPLINE: each comma is ~200ms of silence, em-dash ~300ms, period ~400ms. More than ~5 commas means
you're slowing it down on purpose. Tighten.

──── ANTI-PATTERNS — instant rejection ────
  • "Hey guys", "Did you know", "In this video", "Today we…"
  • "Thanks for watching", "Don't forget to like", "Smash that subscribe"
  • Generic CTAs ("Follow for more", "Comment below").
  • Fade-out closes that trail into nothing.
  • Hedges in the close ("kind of", "sort of", "might be", "maybe").
  • Padding the word count with filler — tight is better than long.
  • Inventing facts, names, or numbers not in the essence below.

──── OUTPUT (JSON, exactly these keys) ────
  "hook"            : the literal first spoken words, punctuated.
  "mechanism_lines" : list of 2-4 sentences (no leading bullets).
  "payoff_line"     : the closing sentence, with the loop-back keyword.
  "narration"       : hook + mechanism + payoff concatenated as ONE string, with inline [tags] inserted. Same words,
                      same order, same punctuation as the structured fields — only tags added.`;

const STOPWORDS = new Set(['the', 'and', 'but', 'for', 'with', 'this', 'that', 'you', 'your', 'are', 'was', 'were', 'they', 'them', 'from', 'have', 'has', 'had', 'what', 'when', 'why', 'how', 'will', 'would', 'could', 'should', 'into', 'their', 'there', 'than', 'then', "here's", 'heres']);
const clean = (w: string) => w.replace(/^[^\p{L}\p{N}$]+|[^\p{L}\p{N}%]+$/gu, '').toLowerCase();

/** Null when the script is usable; otherwise what to fix. */
export const scriptProblem = (s: ShortScript): string | null => {
  const words = stripTags(s.narration).split(' ').filter(Boolean);
  if (words.length < 40 || words.length > 75) return `The narration has ${words.length} words; write 55-62.`;
  if (s.mechanismLines.length < 2 || s.mechanismLines.length > 4) return 'Write 2-4 mechanism lines.';
  const hookWords = s.hook.split(/\s+/).map(clean).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const tail = new Set(words.slice(-12).map(clean));
  if (hookWords.length && !hookWords.some((w) => tail.has(w))) {
    return `Loop-back missing: the last 12 words must repeat one of these hook words: ${hookWords.join(', ')}.`;
  }
  return null;
};

type RawScript = { hook?: string; mechanism_lines?: string[]; payoff_line?: string; narration?: string };

/** Footnote marks copied from price lists ("$135,500*") would be read aloud and captioned. */
const tidy = (t: string | undefined) => (t ?? '').replace(/\*/g, '').replace(/\s{2,}/g, ' ').trim();

const toScript = (raw: RawScript): ShortScript => ({
  hook: tidy(raw.hook),
  mechanismLines: (raw.mechanism_lines ?? []).map(tidy).filter(Boolean),
  payoffLine: tidy(raw.payoff_line),
  narration: tidy(raw.narration),
});

const userPrompt = (inputs: ShortInputs, feedback: string | null): string =>
  [
    `ESSENCE (from the brand — use these facts, invent nothing)
  content_mode : general
  domain       : ${inputs.domain}
  core_claim   : ${inputs.coreClaim}
  mechanism    : ${inputs.mechanism}
  evidence:
${(inputs.evidence ?? []).map((e, i) => `    ${i + 1}. ${e}`).join('\n')}

Write the script now. The mechanism_lines unpack \`mechanism\` using the evidence above; the payoff_line lands on a word
that callbacks the hook.`,
    `BRAND: ${inputs.brandName}. Tone: ${inputs.tone}. Audience: ${inputs.audience}.
OPEN WITH THIS HOOK (our proven bank hook; keep it verbatim, you may drop a trailing colon): "${inputs.hookText}"
Only use facts from the essence and this site text:
${inputs.sourceText}`,
    feedback ? `YOUR LAST DRAFT WAS REJECTED. Fix this and rewrite the whole script:\n${feedback}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

/** One draft, retried up to 3 times until its shape passes `scriptProblem`. `feedback`: what the fact check rejected. */
export const writeScript = async (inputs: ShortInputs, meter: CostMeter, feedback: string | null = null, model = SCRIPT_MODEL): Promise<ShortScript> => {
  let note = feedback;
  let last: ShortScript | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    last = toScript(await creativeJson<RawScript>(SYSTEM, userPrompt(inputs, note), meter, 'Script', model));
    const problem = scriptProblem(last);
    if (!problem) return last;
    note = [feedback, problem].filter(Boolean).join('\n');
  }
  if (!last) throw new Error('Script writer returned nothing');
  return last;
};
