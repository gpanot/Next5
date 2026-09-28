// server-only — never import from a 'use client' file.
// Keeps each new video version of an ad visibly different: the script model tends to pick the same "buyer's peer"
// every time, so from the second version on, code chooses the gender, age band and ethnicity. Pure, unit-tested.

import type { VideoScript } from '../../../types/admin/metaAds';

export type Persona = VideoScript['persona'];

/** Who the next version must cast. The script model still writes the outfit, hair and setting. */
export type Cast = { gender: 'woman' | 'man'; ageMin: number; ageMax: number; ethnicity: string };

const AGE_BANDS: [number, number][] = [[24, 31], [32, 41], [42, 52], [53, 64]];
const ETHNICITIES = ['White', 'Black', 'Latina or Latino', 'East Asian', 'South Asian', 'Middle Eastern'];

const isMan = (gender: string) => /\b(man|male|guy)\b/i.test(gender);

/** "Latina or Latino" matches "Latina"; "East Asian" matches "South Asian" (close enough to count as used). */
const sameEthnicity = (candidate: string, used: string) => {
  const words = candidate.toLowerCase().split(/\s+/).filter((w) => w !== 'or');
  return words.some((w) => used.toLowerCase().includes(w));
};

const pickBand = (previous: Persona[], lastAge: number): [number, number] => {
  const unused = AGE_BANDS.find(([min, max]) => !previous.some((p) => p.age >= min && p.age <= max));
  if (unused) return unused;
  const distance = ([min, max]: [number, number]) => Math.abs((min + max) / 2 - lastAge);
  return AGE_BANDS.reduce((far, band) => (distance(band) > distance(far) ? band : far));
};

/** Null for the first version (the script model casts freely); otherwise the opposite gender and an unused age band and ethnicity. */
export const nextCast = (previous: Persona[]): Cast | null => {
  const last = previous.at(-1);
  if (!last) return null;
  const [ageMin, ageMax] = pickBand(previous, last.age);
  const ethnicity =
    ETHNICITIES.find((e) => !previous.some((p) => sameEthnicity(e, p.ethnicity))) ?? ETHNICITIES[previous.length % ETHNICITIES.length];
  return { gender: isMan(last.gender) ? 'woman' : 'man', ageMin, ageMax, ethnicity };
};

/** Forces the cast onto the model's persona, whatever it answered. */
export const applyCast = (persona: Persona, cast: Cast | null): Persona =>
  cast
    ? { ...persona, gender: cast.gender, age: Math.min(cast.ageMax, Math.max(cast.ageMin, persona.age)), ethnicity: cast.ethnicity }
    : persona;

/** Prompt lines for the script model: the required cast and what the earlier versions already used. */
export const castBrief = (cast: Cast | null, previous: Persona[]): string =>
  cast
    ? `\nCAST (required, a new version of this video): a ${cast.gender}, age ${cast.ageMin}-${cast.ageMax}, ${cast.ethnicity}.
Earlier versions already used these people. Outfit, hair and setting must be clearly different from all of them:
${previous.map((p) => `- ${p.gender}, ${p.age}, ${p.ethnicity} · ${p.hair ?? 'hair n/a'} · ${p.look} · in ${p.setting}`).join('\n')}`
    : '';
