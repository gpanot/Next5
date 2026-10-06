// server-only — never import from a 'use client' file.
// Per-beat on-screen accent (a 2-6 word callout above the captions), biased to none.
// Prompt ported from reels-af accent.py (github.com/Agent-Field/reels-af); flat JSON keys (nano skips nested fields).

import type { CostMeter } from '../metaAds/cost';
import type { ShortBeat, ShortInputs } from '../../types/admin/shorts';
import { creativeJson } from './llm';

const SYSTEM = `You decide whether ONE beat of a vertical reel gets an editorial accent overlay on top of the verbatim
word-by-word subtitles already burned in the frame.

THE DEFAULT IS emit_overlay=false. Most beats will not emit. Over-cluttering the frame is worse than not adding accent.
If no pattern unambiguously applies, emit_overlay MUST be false. Do not manufacture overlays to fill a quota.

Only six canonical patterns are allowed:
  • number — narration mentions a specific number worth locking in for a muted viewer ("$47,000", "85%", "3 STEPS").
    The number must actually appear in this beat's narration.
  • named_entity — a person, place, organization, or product whose spelling matters. Not generic nouns.
  • jargon_translation — the narration uses a domain term and a plain-English gloss would help muted viewers.
  • hook_title_card — ONLY allowed when beat role is 'hook'. A bold question or claim, 5-8 words.
  • reaction — comedic punctuation on a spoken beat ("WAIT WHAT", "NO WAY"). Only when the script clearly has it.
  • list_marker — only when the script is a numbered listicle ("STEP 2 OF 3"). Not for generic enumeration.

Hard rules:
  1. No number, named entity, jargon term or clear emotional / structural beat → emit_overlay MUST be false.
  2. hook_title_card is ONLY valid when the beat role is 'hook'.
  3. Overlay text must be 2-6 words.
  4. The overlay must surface information the viewer needs to lock in (the number's exact value, the name's spelling).

Return JSON with exactly these keys:
{"emit_overlay": boolean, "pattern": string | null, "text": string | null, "reasoning": string}`;

const userPrompt = (beat: ShortBeat, inputs: ShortInputs) => `BEAT INDEX: ${beat.idx}
BEAT ROLE: ${beat.role}
BEAT DURATION: ${beat.spanS.toFixed(2)}s
BEAT NARRATION (verbatim of what's spoken):
  "${beat.text}"

CORE CLAIM: ${inputs.coreClaim}
EVIDENCE:
${(inputs.evidence ?? []).map((e) => `  - ${e}`).join('\n')}

Decide: does this beat warrant an accent overlay? Reminder: most beats should return emit_overlay=false.`;

type RawAccent = { emit_overlay?: boolean; pattern?: string | null; text?: string | null };

const accentFor = async (beat: ShortBeat, inputs: ShortInputs, meter: CostMeter): Promise<string | null> => {
  const raw = await creativeJson<RawAccent>(SYSTEM, userPrompt(beat, inputs), meter, 'Accent');
  const text = raw.text?.replace(/\*/g, '').trim();
  if (!raw.emit_overlay || !text) return null;
  if (raw.pattern === 'hook_title_card' && beat.role !== 'hook') return null;
  return text.split(/\s+/).slice(0, 6).join(' ');
};

export const planAccents = (beats: ShortBeat[], inputs: ShortInputs, meter: CostMeter): Promise<ShortBeat[]> =>
  Promise.all(beats.map(async (b) => ({ ...b, accent: await accentFor(b, inputs, meter) })));
