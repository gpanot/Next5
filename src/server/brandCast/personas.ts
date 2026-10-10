// server-only — never import from a 'use client' file.
// Writes the Brand Cast's people from the brand's audience (ICP) and Visual Bible: real-looking customers, not models,
// each clearly different from the others. Flat keys: the small models skip fields nested in an object.

import type { BrandProfile } from '../../types/admin/companyIntel';
import type { VisualBible } from '../../types/admin/visualBible';
import type { CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { creativeJson } from '../shorts/llm';

export type Persona = { name: string; look: string };

const SYSTEM = `You cast the recurring people of a brand's social media photos: real-looking everyday customers from its
audience, the kind of people who really buy from this brand, not fashion models. They come back across many posts.
- Match the audience: gender, age range, lifestyle and price level. A brand for women casts women; a mixed audience gets a mix.
- Every person looks clearly different from the others: skin tone and ethnicity, hair color and style, build. Diverse, natural, friendly.
- No celebrities, no real people, no uniforms.
Return JSON with flat keys only, for each person N from 1 to {COUNT}:
"person_N_name": first name,
"person_N_age": number,
"person_N_look": 20-35 words: gender, skin tone and ethnicity, face, hair (color, length, style), build, how they carry themselves. No clothing,
"person_N_style": 8-15 words: their everyday clothing style in plain colors, no brand names.`;

const brandText = (profile: BrandProfile, bible: VisualBible | null) => `BRAND: ${profile.brandName} (${profile.domain})
SELLS: ${profile.valueProp}
AUDIENCE: ${profile.audience}
${bible ? `CATEGORY: ${bible.business_category}
PEOPLE AGE RANGE: ${bible.person_age_range}
PEOPLE LOOK (from the brand's photos): ${bible.person_look}
WARDROBE: ${bible.wardrobe}` : `TONE: ${profile.tone}`}`;

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

const toPersonas = (raw: Record<string, unknown>, count: number): Persona[] =>
  Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const name = str(raw[`person_${n}_name`], 30);
    const age = Number(raw[`person_${n}_age`]);
    const look = str(raw[`person_${n}_look`], 400);
    const style = str(raw[`person_${n}_style`], 200).replace(/\.$/, '');
    if (!name || !look) return null;
    const ageText = Number.isFinite(age) && age > 0 ? Math.round(age) : null;
    return { name: ageText ? `${name}, ${ageText}` : name, look: [ageText ? `${ageText} years old.` : '', look, style ? `Everyday style: ${style}.` : ''].filter(Boolean).join(' ') };
  }).filter((p): p is Persona => p !== null);

/**
 * `count` new people for the brand. `avoid`: people already in the cast (and the one being replaced), so the new ones
 * look clearly different. Throws when the model gives fewer than asked.
 */
export const writePersonas = async (profile: BrandProfile, bible: VisualBible | null, count: number, avoid: Persona[], meter: CostMeter): Promise<Persona[]> => {
  const others = avoid.length ? `\n\nALREADY IN THE CAST (each new person must look clearly different from all of them, and have another name):\n${avoid.map((p) => `- ${p.name}: ${p.look}`).join('\n')}` : '';
  const raw = await creativeJson<Record<string, unknown>>(SYSTEM.replace('{COUNT}', String(count)), `${brandText(profile, bible)}${others}\n\nWrite ${count} ${count === 1 ? 'person' : 'people'}.`, meter, 'Brand cast');
  const personas = toPersonas(raw, count);
  if (personas.length < count) throw new Error(`The cast writer gave ${personas.length} of ${count} people`);
  return personas;
};

/** The anchor photo's prompt: one person, full body, facing the camera on a plain bright background, so the image model
 *  can copy the face and build into any scene. */
export const anchorPrompt = (persona: Persona): string =>
  `Vertical reference photo of one real person, full body, standing relaxed and facing the camera at eye level, a natural friendly expression: ${persona.look} Plain bright light-grey studio wall, soft even daylight, true-to-life colors, natural skin texture, sharp focus on the face. The whole body visible from head to feet. No text, no logos, no other people.`;
