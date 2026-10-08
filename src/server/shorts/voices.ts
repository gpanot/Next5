// server-only — never import from a 'use client' file.
// Six candidate voices per short (3 male, 3 female) from Gemini's prebuilt voices, chosen for the brand and script,
// plus one delivery direction. Each reads the hook as a sample; Jev picks the one the first narration uses.
// Gemini Voice Design (custom voices) needs a direct Gemini key and is not on treg, so prebuilt voices are used.

import type { CostMeter } from '../metaAds/cost';
import { jevScore } from '../ai/jev';
import type { ShortInputs, ShortScript, ShortVoiceOption, VoiceGender, VoicePicker } from '../../types/admin/shorts';
import { creativeJson } from './llm';
import { sampleLine, stripTags, VOICE } from './voice';

/** Gemini TTS prebuilt voices with Google's descriptor (ai.google.dev/gemini-api/docs/speech-generation). */
const GEMINI_VOICES: Record<string, { gender: VoiceGender; style: string }> = {
  Zephyr: { gender: 'female', style: 'Bright' },
  Puck: { gender: 'male', style: 'Upbeat' },
  Charon: { gender: 'male', style: 'Informative' },
  Kore: { gender: 'female', style: 'Firm' },
  Fenrir: { gender: 'male', style: 'Excitable' },
  Leda: { gender: 'female', style: 'Youthful' },
  Orus: { gender: 'male', style: 'Firm' },
  Aoede: { gender: 'female', style: 'Breezy' },
  Callirrhoe: { gender: 'female', style: 'Easy-going' },
  Autonoe: { gender: 'female', style: 'Bright' },
  Enceladus: { gender: 'male', style: 'Breathy' },
  Iapetus: { gender: 'male', style: 'Clear' },
  Umbriel: { gender: 'male', style: 'Easy-going' },
  Algieba: { gender: 'male', style: 'Smooth' },
  Despina: { gender: 'female', style: 'Smooth' },
  Erinome: { gender: 'female', style: 'Clear' },
  Algenib: { gender: 'male', style: 'Gravelly' },
  Rasalgethi: { gender: 'male', style: 'Informative' },
  Laomedeia: { gender: 'female', style: 'Upbeat' },
  Achernar: { gender: 'female', style: 'Soft' },
  Alnilam: { gender: 'male', style: 'Firm' },
  Schedar: { gender: 'male', style: 'Even' },
  Gacrux: { gender: 'female', style: 'Mature' },
  Pulcherrima: { gender: 'female', style: 'Forward' },
  Achird: { gender: 'male', style: 'Friendly' },
  Zubenelgenubi: { gender: 'male', style: 'Casual' },
  Vindemiatrix: { gender: 'female', style: 'Gentle' },
  Sadachbia: { gender: 'male', style: 'Lively' },
  Sadaltager: { gender: 'male', style: 'Knowledgeable' },
  Sulafat: { gender: 'female', style: 'Warm' },
};

const PER_GENDER = 3;
/** Used when the planner returns too few valid voices. */
const DEFAULTS: Record<VoiceGender, string[]> = { male: ['Achird', 'Puck', 'Charon'], female: ['Kore', 'Sulafat', 'Laomedeia'] };

const catalog = Object.entries(GEMINI_VOICES).map(([name, v]) => `${name} (${v.gender}, ${v.style})`).join(', ');

const SYSTEM = `You cast the narrator of a 20-40 second vertical educational short (TikTok / Reels) for one brand: the brand's expert
teaching one useful lesson, never selling.
Pick ${PER_GENDER} male and ${PER_GENDER} female voices from this list ONLY, best fit first within each gender:
${catalog}

Fit the voice to who the brand talks to and how the script sounds: a golf coach brand wants a friendly expert, a
luxury car a smooth confident voice, a kitchen app a warm relatable one. Avoid voices that would sound off for it.

Also write "direction": one sentence of delivery notes for the narrator (persona, energy, warmth), e.g.
"A friendly golf coach talking to a student at the range: confident, upbeat, brisk, never salesy." It is applied
to every sentence, so describe a steady delivery, not one emotion. The pace is always brisk, like a fast social
video: never "calm", "slow", "measured" or "relaxed".

Return JSON with exactly these flat keys:
{"direction": string,
 "male_1": string, "male_1_why": string, "male_2": string, "male_2_why": string, "male_3": string, "male_3_why": string,
 "female_1": string, "female_1_why": string, "female_2": string, "female_2_why": string, "female_3": string, "female_3_why": string}
Each name is exactly as listed; each why is under 15 words.`;

const userPrompt = (inputs: ShortInputs, script: ShortScript) => `BRAND: ${inputs.brandName} (${inputs.domain})
AUDIENCE: ${inputs.audience}
TONE: ${inputs.tone}
SCRIPT: ${stripTags(script.narration)}`;

type RawCast = Record<string, string | undefined>;

/** Up to 3 valid, distinct names of one gender from the planner's answer, topped up from the defaults. */
const castGender = (raw: RawCast, gender: VoiceGender): ShortVoiceOption[] => {
  const picked: ShortVoiceOption[] = [];
  const add = (name: string | undefined, why: string) => {
    const voice = name ? GEMINI_VOICES[name.trim()] : undefined;
    if (!name || !voice || voice.gender !== gender || picked.some((p) => p.name === name.trim()) || picked.length >= PER_GENDER) return;
    picked.push({ name: name.trim(), gender, style: voice.style, why });
  };
  for (let i = 1; i <= PER_GENDER; i++) add(raw[`${gender}_${i}`], raw[`${gender}_${i}_why`]?.trim() || '');
  for (const name of DEFAULTS[gender]) add(name, 'Default pick (the planner gave too few voices).');
  return picked;
};

/** The 6 candidates and the delivery direction for this brand and script. */
export const planVoices = async (inputs: ShortInputs, script: ShortScript, meter: CostMeter): Promise<{ direction: string; options: ShortVoiceOption[] }> => {
  const raw = await creativeJson<RawCast>(SYSTEM, userPrompt(inputs, script), meter, 'Voice casting').catch(() => ({}) as RawCast);
  const direction = raw.direction?.replace(/\s+/g, ' ').trim() || `A friendly, confident narrator speaking to ${inputs.audience || 'the viewer'}: clear, upbeat, natural.`;
  return { direction, options: [...castGender(raw, 'female'), ...castGender(raw, 'male')] };
};

const JEV_RUBRIC = [
  'Clearly wrong voice for this brand and audience',
  'Poor fit',
  'Acceptable fit',
  'Good fit',
  'Ideal voice for this brand, audience and script',
];

/** Jev scores every option; the best one narrates. Without Jev scores, the planner's first female pick does. */
export const pickVoice = async (
  options: ShortVoiceOption[],
  inputs: ShortInputs,
  script: ShortScript,
  direction: string,
): Promise<{ options: ShortVoiceOption[]; voice: string; pickedBy: VoicePicker }> => {
  const scored = await Promise.all(
    options.map(async (o) => ({
      ...o,
      jevScore: await jevScore(
        { brand: inputs.brandName, domain: inputs.domain, audience: inputs.audience, tone: inputs.tone, script: stripTags(script.narration), delivery: direction, voice: `${o.gender}, ${o.style.toLowerCase()} voice`, why: o.why },
        'How well does this narrator voice fit this short educational video for this brand and audience?',
        JEV_RUBRIC,
      ),
    })),
  );
  const best = scored.filter((o) => typeof o.jevScore === 'number').sort((a, b) => (b.jevScore ?? 0) - (a.jevScore ?? 0))[0];
  if (best) return { options: scored, voice: best.name, pickedBy: 'jev' };
  return { options: scored, voice: scored[0]?.name ?? VOICE, pickedBy: 'planner' };
};

/** The hook read by each option. A failed sample leaves that option without one; it can still be chosen. */
export const sampleVoices = (
  options: ShortVoiceOption[],
  hook: string,
  direction: string,
  meter: CostMeter,
  save: (name: string, wav: Buffer) => Promise<string>,
): Promise<ShortVoiceOption[]> =>
  Promise.all(
    options.map(async (o) => {
      try {
        return { ...o, sampleKey: await save(o.name, await sampleLine(hook, { voice: o.name, direction }, meter)) };
      } catch (err) {
        console.warn(`[shorts] sample of ${o.name} failed:`, err instanceof Error ? err.message.slice(0, 120) : err);
        return o;
      }
    }),
  );

export const isKnownVoice = (name: string): boolean => name in GEMINI_VOICES;
