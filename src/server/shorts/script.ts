// server-only — never import from a 'use client' file.
// The short's narration: a clear lesson hook → one named proof → one body structure → a closing line that echoes the hook.
// Prompt ported from reels-af compose.py (github.com/Agent-Field/reels-af, general mode); since 2026-10-08 it follows the
// Next5 content guidelines (guidelines.ts): every short teaches, never sells, and runs 20-40 s at reels-af's pace.

import type { CostMeter } from '../metaAds/cost';
import type { ShortInputs, ShortScript } from '../../types/admin/shorts';
import { BANNED_PHRASES, BODY_STRUCTURES, educationBlock } from './guidelines';
import { creativeJson, smartModel } from './llm';
import { stripTags } from './voice';

const STOPWORDS = new Set(['the', 'and', 'but', 'for', 'with', 'this', 'that', 'you', 'your', 'are', 'was', 'were', 'they', 'them', 'from', 'have', 'has', 'had', 'what', 'when', 'why', 'how', 'will', 'would', 'could', 'should', 'into', 'their', 'there', 'than', 'then', "here's", 'heres', 'does', 'just', 'most']);
const clean = (w: string) => w.replace(/^[^\p{L}\p{N}$]+|[^\p{L}\p{N}%]+$/gu, '').toLowerCase();
/** Hook words worth echoing in the close: 4+ letters, not stopwords. */
const hookKeywords = (hook: string) => hook.split(/\s+/).map(clean).filter((w) => w.length >= 4 && !STOPWORDS.has(w));

/** 55-85 words at ~160 wpm (breaths included) lands at ~21-32 s; the check allows a little slack. */
const MIN_WORDS = 50;
const MAX_WORDS = 90;

const SYSTEM = `You are writing the narration of a 20-40 second vertical educational short (TikTok, Reels, Shorts).

The structure is FIXED. Do not deviate.

  1. HOOK          — under 12 spoken words. States exactly what the viewer will learn (see the rules below).

  2. BODY LINES    — 4-6 sentences that build to ONE takeaway in ONE structure: ${BODY_STRUCTURES.join(' | ')}
                     (default belief_then_reveal). Somewhere early, one real named proof from SOURCE.
                     Each sentence is one shot downstream (one picture per sentence), so each must stand alone.
                     Names, numbers, specific things — not vibes. At most 2 numbers per sentence.

  3. TAKEAWAY      — 1 closing sentence that wraps the video up: the one insight restated as a short, quotable line,
                     echoing a distinctive word from the HOOK (a noun, not a stopword) so the viewer loops back.
                     It is a conclusion, not one more instruction ("Contact the best lead first." is NOT a close;
                     "A ready lead isn't just a fit, it's a fit showing a signal." is).

REGISTER: talk like a friendly expert explaining to one person. Plain words a 9-year-old understands; second person.
Short sentences, 8-16 words each. One idea per sentence.

TOTAL LENGTH: 55-85 words. The voice reads ~160 words a minute with a breath between sentences, so the short lands at
~21-32 s. Do not pad: a 60-word lesson that is tight beats an 85-word one that drags. Numbers are read in full
("$135,500" is 7 spoken words): round them ("$135K").

NO TAGS: the "narration" is read verbatim by a TTS engine. Never write [bracketed] delivery tags or stage directions;
the engine reads them out loud. Rhythm comes from punctuation only.

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
  "narration"       : hook + body + takeaway concatenated as ONE string. Same words, order and punctuation.
  "cta"             : on-screen text for the last scene, 2-6 words: "Save this for later", "Follow for part 2", or the
                      comment question. "" when the close has no call to action. Never an offer.`;

/** Null when the script is usable; otherwise what to fix. */
export const scriptProblem = (s: ShortScript): string | null => {
  const words = stripTags(s.narration).split(' ').filter(Boolean);
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return `The narration has ${words.length} words; write 55-85.`;
  if (s.mechanismLines.length < 3 || s.mechanismLines.length > 6) return 'Write 4-6 body lines.';
  if (s.hook.split(/\s+/).filter(Boolean).length > 12) return 'The hook is over 12 words: cut it to what the viewer will learn.';
  const keys = hookKeywords(s.hook);
  const close = new Set(s.payoffLine.split(/\s+/).map(clean));
  if (keys.length && !keys.some((w) => close.has(w))) {
    return `The takeaway must wrap up the video and repeat one of these hook words: ${keys.join(', ')}.`;
  }
  const banned = stripTags(s.narration).match(BANNED_PHRASES);
  if (banned) return `"${banned[0]}" makes it an ad. Remove it: the close is a takeaway, not an offer.`;
  return null;
};

type RawScript = { structure?: string; cta?: string; hook?: string; mechanism_lines?: string[]; payoff_line?: string; narration?: string };

/** Footnote marks copied from price lists ("$135,500*") would be read aloud and captioned. */
const tidy = (t: string | undefined) => stripTags((t ?? '').replace(/\*/g, ''));

const toScript = (raw: RawScript): ShortScript => ({
  hook: tidy(raw.hook),
  mechanismLines: (raw.mechanism_lines ?? []).map(tidy).filter(Boolean),
  payoffLine: tidy(raw.payoff_line),
  narration: tidy(raw.narration),
  structure: raw.structure?.trim() || undefined,
  cta: tidy(raw.cta) || undefined,
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
    feedback
      ? `YOUR LAST DRAFT WAS REJECTED. Fix this and rewrite the whole script, keeping every rule above (one takeaway, a closing line that wraps up and echoes the hook):\n${feedback}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

/** One draft, retried up to 3 times until its shape passes `scriptProblem`. `feedback`: what the fact check rejected. */
export const writeScript = async (inputs: ShortInputs, meter: CostMeter, feedback: string | null = null, model = smartModel()): Promise<ShortScript> => {
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
