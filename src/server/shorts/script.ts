// server-only — never import from a 'use client' file.
// The short's narration: a clear lesson hook → Proof/Promise/Plan → one body structure → a one-line takeaway.
// Prompt ported from reels-af compose.py (github.com/Agent-Field/reels-af, general mode); since 2026-10-08 it follows the
// Next5 content guidelines (guidelines.ts): every short teaches, never sells, and runs 20-40 s at reels-af's pace.

import type { CostMeter } from '../metaAds/cost';
import type { ShortInputs, ShortScript } from '../../types/admin/shorts';
import { BANNED_PHRASES, BODY_STRUCTURES, educationBlock } from './guidelines';
import { creativeJson, SCRIPT_MODEL } from './llm';
import { stripTags } from './voice';

const TAG_VOCAB = `  ALLOWED (use ≤3 total across the whole narration):
    • [curious]   — at the cold open, ONCE
    • [emphasis]  — on the single most surprising word, ONCE
    • [confident] — at the takeaway, ONCE (optional)

  BANNED — do NOT use any of these. They insert real silence and blow the engagement budget:
    • [pause] [pause short] [pause long] [breath]
    • [slow] [building] [thoughtful] [wonder] [skeptical]
    • [serious] [warm] [whispers] [quiet] [intense] [hopeful]
    • Any other tag that slows delivery

  Trust the punctuation (commas, em-dashes, periods) for rhythm. Less is more.`;

/** 60-95 words at ~170 wpm (pauses included) lands at ~21-34 s; the check allows a little slack. */
const MIN_WORDS = 55;
const MAX_WORDS = 100;

const SYSTEM = `You are writing the narration of a 20-40 second vertical educational short (TikTok, Reels, Shorts).

The structure is FIXED. Do not deviate.

  1. HOOK          — under 12 spoken words. States exactly what the viewer will learn (see the rules below).

  2. BODY LINES    — 4-6 sentences that build to ONE takeaway in ONE structure: ${BODY_STRUCTURES.join(' | ')}
                     (default belief_then_reveal). Somewhere early, one real named proof from SOURCE.
                     Each sentence is one shot downstream (one picture per sentence), so each must stand alone.
                     Names, numbers, specific things — not vibes. At most 2 numbers per sentence.

  3. TAKEAWAY      — 1 closing sentence: the one insight restated, echoing a distinctive word from the HOOK (a noun,
                     not a stopword) so the viewer loops back. An allowed call to action only if it still fits.

REGISTER: talk like a friendly expert explaining to one person. Plain words a 9-year-old understands; second person.
Short sentences, 8-16 words each. One idea per sentence.

TOTAL LENGTH: 60-95 words. The voice reads ~170 words a minute with a breath between sentences, so the short lands at
~21-34 s. Do not pad: a 65-word lesson that is tight beats a 95-word one that drags. Numbers are read in full
("$135,500" is 7 spoken words): round them ("$135K").

──── INLINE TTS TAGS — STRICTLY LIMITED ────
The "narration" field is passed VERBATIM to a TTS engine. Tags go in [square brackets] BEFORE the clause they modify.
${TAG_VOCAB}

PUNCTUATION: end every sentence with a period, question mark or exclamation mark (each one is a short breath). Few
commas inside a sentence.

──── ANTI-PATTERNS — instant rejection ────
  • "Hey guys", "Did you know", "In this video", "Today we…"
  • "Thanks for watching", "Don't forget to like", "Smash that subscribe"
  • Hedges ("kind of", "sort of", "might be", "maybe").
  • Inventing facts, names, customers or numbers not in the SOURCE below.

──── OUTPUT (JSON, exactly these keys) ────
  "structure"       : one of ${BODY_STRUCTURES.join(', ')}.
  "hook"            : the literal first spoken words, punctuated.
  "mechanism_lines" : list of the 4-6 body sentences (opening lines first; no leading bullets or numbering marks).
  "payoff_line"     : the takeaway sentence.
  "narration"       : hook + body + takeaway concatenated as ONE string, with inline [tags] inserted. Same words,
                      same order, same punctuation as the structured fields — only tags added.`;

/** Null when the script is usable; otherwise what to fix. */
export const scriptProblem = (s: ShortScript): string | null => {
  const words = stripTags(s.narration).split(' ').filter(Boolean);
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return `The narration has ${words.length} words; write 60-95.`;
  if (s.mechanismLines.length < 3 || s.mechanismLines.length > 6) return 'Write 4-6 body lines.';
  if (s.hook.split(/\s+/).filter(Boolean).length > 12) return 'The hook is over 12 words: cut it to what the viewer will learn.';
  const banned = stripTags(s.narration).match(BANNED_PHRASES);
  if (banned) return `"${banned[0]}" makes it an ad. Remove it: the close is a takeaway, not an offer.`;
  return null;
};

type RawScript = { structure?: string; hook?: string; mechanism_lines?: string[]; payoff_line?: string; narration?: string };

/** Footnote marks copied from price lists ("$135,500*") would be read aloud and captioned. */
const tidy = (t: string | undefined) => (t ?? '').replace(/\*/g, '').replace(/\s{2,}/g, ' ').trim();

const toScript = (raw: RawScript): ShortScript => ({
  hook: tidy(raw.hook),
  mechanismLines: (raw.mechanism_lines ?? []).map(tidy).filter(Boolean),
  payoffLine: tidy(raw.payoff_line),
  narration: tidy(raw.narration),
  structure: raw.structure?.trim() || undefined,
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

Write the script now. Teach ONE lesson a future customer would search for, using the facts above as the
expert's knowledge and proof.`,
    `BRAND: ${inputs.brandName}. Tone: ${inputs.tone}. Audience: ${inputs.audience}.
LESSON TOPIC: ${inputs.meatTopic || inputs.coreClaim}
STARTING HOOK (from our hook bank): "${inputs.hookText}"
Keep it verbatim only when it names the topic and the viewer can tell what they will learn from it alone. When it is a
teaser that hides the topic ("Your next customer is already showing you the signs"), vague or an offer, rewrite it on
the same topic (a clear outcome, or a question naming the viewer's pain).
Only use facts from the essence and this SOURCE (site text):
${inputs.sourceText}`,
    educationBlock(inputs),
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
