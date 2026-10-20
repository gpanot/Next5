// server-only — never import from a 'use client' file.
// Writes the Brand Cast's people from the brand's audience (ICP) and Visual Bible: good-looking, fit people the audience
// wants to look like (aspirational, at the younger end of the audience, 2026-10-15), real and believable, not runway
// models, each clearly different from the others. Written by GPT-6.1 Sol (the user's pick, 2026-10-10). Flat keys: the small
// models skip fields nested in an object.

import type { BrandProfile } from '../../types/admin/companyIntel';
import { TARGET_AGE_LABELS, TARGET_CAST_AGES, type TargetGender } from '../../types/admin/targetClient';
import type { VisualBible } from '../../types/admin/visualBible';
import type { CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { creativeJson, type UserContent } from '../shorts/llm';
import type { TargetClient } from '../autoSlideshow/targetClient';

/** The cast writer (the user's pick, 2026-10-10); gpt-5.4-nano answers when it fails. */
const CAST_MODEL = 'gpt-6.1-sol';

/** Written faces stay in this age range (the owner can still pick any age with "Edit name and age", or ask in a swap).
 *  When the owner picked a target client, its range instead (TARGET_CAST_AGES). */
const CAST_MIN_AGE = 22;
const CAST_MAX_AGE = 42;

const castAges = (target: TargetClient | null) => (target ? TARGET_CAST_AGES[target.age] : { min: CAST_MIN_AGE, max: CAST_MAX_AGE });

const GENDER_RULE: Record<TargetGender, { who: string; cast: string }> = {
  female: { who: 'women', cast: 'every person is a woman' },
  male: { who: 'men', cast: 'every person is a man' },
  both: { who: 'women and men', cast: 'a mix of women and men (one person: either)' },
};

/** The owner's own pick of who they sell to most today: it wins over the audience read from the site. */
const targetText = (target: TargetClient | null) => (target
  ? `\nTARGET CLIENT (the owner's pick, it wins over AUDIENCE): ${GENDER_RULE[target.gender].who}, aged ${TARGET_AGE_LABELS[target.age]}. Cast: ${GENDER_RULE[target.gender].cast}, aged ${castAges(target).min}-${castAges(target).max}.`
  : '');

/** `outfitPhoto`: index into the outfit photos the writer was shown (OUTFIT PHOTOS P1, P2…); null when it said none
 *  fits; missing when it did not answer. */
export type Persona = { name: string; look: string; outfitPhoto?: number | null };

/** What the owner asked for when swapping a face: a note ("same face, in EQL leggings"), a reference photo, or both. */
export type CastGuide = { note?: string; photoUrl?: string; current?: Persona };

const SYSTEM = `You cast the recurring people of a brand's social media photos. They come back across many posts, so viewers
must like looking at them: good-looking, fit, healthy, confident people from the brand's audience, the ones that audience
wants to look like. Think of the most attractive creator a brand would pick for its best TikToks: real and believable
(natural skin, real proportions), not airbrushed runway models.
- Match the audience's gender, lifestyle and price level. A brand for women casts women; a mixed audience gets a mix.
  A TARGET CLIENT line is the owner's own pick: follow its gender and ages exactly.
- Age: the younger, energetic end of the audience, between {MIN} and {MAX}. Older people look young for their age and
  active. Never elderly.
- Bodies: fit, slim, toned or athletic, good posture. Faces: attractive, clear healthy skin, bright warm smile, well groomed hair.
- Every person looks clearly different from the others: skin tone and ethnicity, hair color and style, face. Diverse, friendly.
- Dress them for the brand: when it sells clothing, shoes or accessories, they wear the brand's own pieces (from WARDROBE
  and PRODUCTS), concrete pieces and colors; otherwise the everyday clothes of the brand's world.
- No celebrities, no uniforms.
Return JSON with flat keys only, for each person N from 1 to {COUNT}:
"person_N_name": first name,
"person_N_age": number,
"person_N_look": 20-35 words: gender, skin tone and ethnicity, attractive face, hair (color, length, style), fit build, how they carry themselves. No clothing,
"person_N_outfit": 10-20 words: what they wear in the photos, concrete pieces and colors, no brand names,
"person_N_outfit_photo": the OUTFIT PHOTOS id (P1, P2...) whose pieces they wear, matching person_N_outfit; each
person another one when there are enough; "none" when there are none, or when none fits this person (women's pieces on
a man, kids' clothes on an adult...): then person_N_outfit describes clothes of the brand's world that fit them.`;

const brandText = ({ profile, bible, products, outfits, target }: CastBrief) => `BRAND: ${profile.brandName} (${profile.domain})
SELLS: ${profile.valueProp}
AUDIENCE: ${profile.audience}${targetText(target)}
${bible ? `CATEGORY: ${bible.business_category}
AUDIENCE AGE RANGE (cast at its younger end): ${bible.person_age_range}
PEOPLE LOOK (from the brand's photos): ${bible.person_look}
WARDROBE: ${bible.wardrobe}` : `TONE: ${profile.tone}`}
PRODUCTS (from the brand's own photos): ${products.join('; ') || 'none'}
OUTFIT PHOTOS: ${outfits.length ? outfits.map((o, i) => `P${i + 1}: ${o}`).join('; ') : 'none'}`;

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

/** `ages`: keeps written ages within this range (null when the owner guided the swap). */
const toPersonas = (raw: Record<string, unknown>, count: number, outfits: number, ages: { min: number; max: number } | null): Persona[] =>
  Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const name = str(raw[`person_${n}_name`], 30);
    const age = Number(raw[`person_${n}_age`]);
    const look = str(raw[`person_${n}_look`], 400);
    const outfit = str(raw[`person_${n}_outfit`] ?? raw[`person_${n}_style`], 200).replace(/\.$/, '');
    if (!name || !look) return null;
    const written = Number.isFinite(age) && age > 0 ? Math.round(age) : null;
    const ageText = written && ages ? Math.min(ages.max, Math.max(ages.min, written)) : written;
    const said = str(raw[`person_${n}_outfit_photo`], 6);
    const photo = Number(said.replace(/^P/i, '')) - 1;
    return {
      name: ageText ? `${name}, ${ageText}` : name,
      look: [ageText ? `${ageText} years old.` : '', look, outfit ? `Outfit: ${outfit}.` : ''].filter(Boolean).join(' '),
      ...(Number.isInteger(photo) && photo >= 0 && photo < outfits ? { outfitPhoto: photo } : /^none$/i.test(said) ? { outfitPhoto: null } : {}),
    };
  }).filter((p): p is Persona => p !== null);

/** The owner's wishes, which win over the casting rules (a photo of a real person they chose is allowed). */
const guideText = (guide: CastGuide | undefined): string => {
  if (!guide?.note && !guide?.photoUrl) return '';
  return [
    '\n\nTHE BRAND OWNER IS REPLACING ONE PERSON. Their wishes win over the rules above.',
    guide.current ? `PERSON BEING REPLACED: ${guide.current.name}: ${guide.current.look}\nKeep what the owner does not ask to change; keep the name when the face stays.` : '',
    guide.note ? `OWNER'S NOTE: ${guide.note}` : '',
    guide.photoUrl ? 'REFERENCE PHOTO (attached): base the person on the one in this photo: gender, age, skin tone, face, hair, build. Their outfit too, unless the note or the brand says otherwise.' : '',
  ].filter(Boolean).join('\n');
};

/** What the writer knows about the brand: its profile, Visual Bible, product names, the outfit photos it may pick and the
 *  owner's target client (null when not picked). */
export type CastBrief = { profile: BrandProfile; bible: VisualBible | null; products: string[]; outfits: string[]; target: TargetClient | null };

/**
 * `count` new people for the brand. `avoid`: people already in the cast, so the new ones look clearly different.
 * `guide`: the owner's note and/or reference photo when they swap one face. Throws when the model gives fewer than asked.
 */
export const writePersonas = async (brief: CastBrief, count: number, avoid: Persona[], meter: CostMeter, guide?: CastGuide): Promise<Persona[]> => {
  const others = avoid.length ? `\n\nALREADY IN THE CAST (each new person must look clearly different from all of them, and have another name):\n${avoid.map((p) => `- ${p.name}: ${p.look}`).join('\n')}` : '';
  const text = `${brandText(brief)}${others}${guideText(guide)}\n\nWrite ${count} ${count === 1 ? 'person' : 'people'}.`;
  const user: UserContent = guide?.photoUrl ? [{ type: 'text', text }, { type: 'image_url', image_url: { url: guide.photoUrl, detail: 'low' } }] : text;
  const ages = castAges(brief.target);
  const system = SYSTEM.replace('{COUNT}', String(count)).replace('{MIN}', String(ages.min)).replace('{MAX}', String(ages.max));
  const raw = await creativeJson<Record<string, unknown>>(system, user, meter, 'Brand cast', CAST_MODEL);
  const personas = toPersonas(raw, count, brief.outfits.length, guide?.note || guide?.photoUrl ? null : ages);
  if (personas.length < count) throw new Error(`The cast writer gave ${personas.length} of ${count} people`);
  return personas;
};

/** What each reference image of the anchor photo is for, in the order they are sent. */
export type AnchorRefs = { person: boolean; outfit: string | null };

/** The anchor photo's prompt: one person, full body, facing the camera on a plain bright background, so the image model
 *  can copy the face and build into any scene. `refs`: the owner's photo of the person, and/or a brand product photo
 *  for the outfit. */
export const anchorPrompt = (persona: Persona, refs: AnchorRefs = { person: false, outfit: null }): string => {
  const notes = [
    ...(refs.person ? ['Image 1 is the person to show: keep the same face, hair, skin tone and build.'] : []),
    ...(refs.outfit ? [`Image ${refs.person ? 2 : 1} shows the brand's ${refs.outfit}: dress the person in exactly these pieces (same cut, colors and details); do not copy that photo's person, face or background.`] : []),
  ];
  return [`Vertical reference photo of one real, good-looking, fit and healthy person, full body, standing relaxed and confident and facing the camera at eye level, a bright warm smile: ${persona.look} Well groomed, clear glowing skin, flattering soft light. Plain bright light-grey studio wall, soft even daylight, true-to-life colors, natural skin texture (not airbrushed), sharp focus on the face. The whole body visible from head to feet. No text, no logos, no other people.`, ...notes].join(' ');
};
