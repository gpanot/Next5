// server-only — never import from a 'use client' file.
// One call per short before the shot plans: a different setting and person for each beat, so the photos of one short
// stop looking like the same office with the same three people (user feedback 2026-10-08). Flat JSON keys: the small
// models skip fields nested in objects. The payoff may come back to the hook's setting to close the loop.

import type { CostMeter } from '../metaAds/cost';
import type { ShortBeat, ShortInputs } from '../../types/admin/shorts';
import { creativeJson } from './llm';

/** What one beat's photo must use: where it happens and who is in it. */
export type BeatCast = { setting: string; person: string };

const SYSTEM = `You plan the visual world of a 20-40 second vertical educational short, one entry per beat.

For EACH beat give:
  - setting: a specific real place where this line's lesson happens, 6-14 words ("a cramped two-desk agency office,
    whiteboard full of client names", "a kitchen table at home, laptop next to school papers").
  - person: who is in the frame, 6-14 words: age, gender, look, clothing ("a woman in her 50s, grey bob, denim shirt").
    Write "no person" when the beat is about an object or a detail.

RULES:
  - Every beat gets a DIFFERENT setting and a DIFFERENT person from all other beats. Vary ages, genders, ethnicities,
    clothing, indoor/outdoor, home/work, big/small spaces. Never two near-identical offices in a row.
  - Exception: the LAST beat (the payoff) may return to the first beat's setting and person to close the loop.
  - Everything fits the audience and the topic: places these people really work and live. Realistic, everyday, daylight.
  - No celebrities, no brand mascots, no text-bearing places (no billboards, no signs to read).

Return JSON with flat keys only: {"beat_0_setting": string, "beat_0_person": string, "beat_1_setting": string, ...}`;

const userPrompt = (beats: ShortBeat[], inputs: ShortInputs) => `BRAND: ${inputs.brandName} (${inputs.domain})
AUDIENCE: ${inputs.audience}
BRAND LOOK: ${inputs.photoStyle || 'none'}

BEATS:
${beats.map((b) => `  beat_${b.idx} (${b.role}): "${b.text}"`).join('\n')}`;

/** One setting and person per beat (by index). A beat the model left out gets nulls and the shot planner decides alone. */
export const planCast = async (beats: ShortBeat[], inputs: ShortInputs, meter: CostMeter): Promise<(BeatCast | null)[]> => {
  const raw = await creativeJson<Record<string, string | undefined>>(SYSTEM, userPrompt(beats, inputs), meter, 'Cast and settings').catch(
    () => ({}) as Record<string, string | undefined>,
  );
  return beats.map((b) => {
    const setting = raw[`beat_${b.idx}_setting`]?.trim();
    const person = raw[`beat_${b.idx}_person`]?.trim();
    return setting && person ? { setting, person } : null;
  });
};
