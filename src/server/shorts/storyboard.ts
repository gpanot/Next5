// server-only — never import from a 'use client' file.
// Shot planning for a brand with a Visual Bible (replaces cast.ts + the per-beat shot types for those brands):
// one storyboard call for the whole short (one main character, the setting chosen by the action), then each beat's
// shot plan with the bible and the full storyboard. Rules from the EQL/Porsche A/B tests (2026-10-09): the line's action
// wins over posing, the place must make sense for the action (no detergent in a bedroom), and a close-up shows no person
// or only hands (a person beside a wheel close-up came out with no legs). Flat JSON keys: small models skip nested ones.

import type { CostMeter } from '../metaAds/cost';
import type { MotionHint, ShortBeat, ShortInputs, ShotBoard } from '../../types/admin/shorts';
import type { VisualBible } from '../../types/admin/visualBible';
import { creativeJson, smartModel } from './llm';
import { LIGHT_WORDS } from './visualBible';
import { MOTIONS, sanitizeImagePrompt } from './visuals';

export const bibleBlock = (b: VisualBible) => `VISUAL BIBLE (the brand's look; every shot follows it):
  hero product   : ${b.hero_product}
  category       : ${b.business_category}
  primary subject: ${b.primary_subject}
  people         : age ${b.person_age_range}; ${b.person_look}
  wardrobe       : ${b.wardrobe}
  environments   : ${b.environments}
  visual style   : ${b.visual_style}
  product        : ${b.product_visibility}
  consistency    : ${b.consistency_rules}
  avoid          : ${b.avoid}`;

const STORY_SYSTEM = `You storyboard a 20-40 second vertical EDUCATIONAL short for a brand, one entry per beat. The brand teaches, never sells.

For EACH beat give flat keys:
  beat_N_shot   : one shot type from the bible's shot vocabulary, adapted to the line (6-14 words)
  beat_N_setting: the real place where THIS line's action happens (6-14 words). Use the bible's environments for
                  brand-world beats (hook, payoff, wearing or using the product); for a practical action use the room
                  where people really do it (washing = laundry room or bathroom sink, cooking = kitchen, charging = garage),
                  styled at the brand's price level. Ask: would a real person do this here? If not, change the place.
  beat_N_person : who is in frame, 6-16 words, or "no person"
  beat_N_product: how the product appears in this shot (4-12 words), or "not shown"

RULES:
  - ONE main character for the whole video, described the same way every time (same age, look, hair), dressed per the
    bible's wardrobe. A second person only where the line needs one (a friend, a client), also within the bible's age
    range and look.
  - Variety comes from the SCENE: never the same shot type twice in a row, at least 3 different settings, mix wide,
    medium and close-up, and a different pose in every shot.
  - ACTION beats (mechanism): the line's key object or action is IN the frame and named in the shot (detergent line =
    the detergent bottle and cap in her hands; braking line = the car braking on a road). Abstract hook and payoff
    lines: the main character with the product in a clear, calm moment.
  - FRAMING AND PEOPLE: a close-up or detail shot (wheel, fabric, hands, badge) has either NO person or only the part of
    the body that naturally enters the crop (hands, forearm, torso edge). A full person only in medium or wide shots,
    with the whole body that the frame shows anatomically complete.
  - Never mention labels, signs, text, prices or numbers: say the object itself ("the detergent bottle and its cap").
  - Light words (golden, sunset, dusk, cinematic, moody) are never part of a setting: all shots are bright daylight.
  - Follow "avoid" strictly.
  - The last beat (payoff) may return to the first beat's setting to close the loop.

Return JSON with flat keys only.`;

const storyUser = (beats: ShortBeat[], bible: VisualBible, inputs: ShortInputs) => `BRAND: ${inputs.brandName}
AUDIENCE: ${inputs.audience}

${bibleBlock(bible)}
  shot vocabulary: ${bible.shot_vocabulary}

BEATS:
${beats.map((b) => `  beat_${b.idx} (${b.role}): "${b.text}"`).join('\n')}`;

/** One storyboard row per beat (by index); null where the model left a beat out. */
export const planStoryboard = async (beats: ShortBeat[], bible: VisualBible, inputs: ShortInputs, meter: CostMeter): Promise<(ShotBoard | null)[]> => {
  const raw = await creativeJson<Record<string, unknown>>(STORY_SYSTEM, storyUser(beats, bible, inputs), meter, 'Storyboard', smartModel()).catch(() => ({}) as Record<string, unknown>);
  return beats.map((b) => {
    const get = (k: string) => {
      const v = raw[`beat_${b.idx}_${k}`];
      return typeof v === 'string' ? v.trim() : '';
    };
    if (!get('shot') || !get('setting')) return null;
    return { shot: get('shot'), setting: get('setting').replace(LIGHT_WORDS, '').trim(), person: get('person') || 'no person', product: get('product') || 'not shown' };
  });
};

const boardLine = (b: ShotBoard | null, i: number) => (b ? `beat_${i}: ${b.shot} · ${b.setting} · ${b.person} · product: ${b.product}` : `beat_${i}: (free)`);

const shotSystem = (beat: ShortBeat, inputs: ShortInputs, bible: VisualBible, boards: (ShotBoard | null)[]) => `You are planning the photo for ONE beat of a 20-40 second vertical educational reel by ${inputs.brandName}.

This is beat ${beat.idx} (role ${beat.role}, ~${beat.spanS.toFixed(1)}s of audio). The photo shows the concrete thing THIS line
teaches, inside the brand's world. No stock-photo handshakes, no smiling at the camera, never an ad or studio hero shot.

${bibleBlock(bible)}

THE WHOLE STORYBOARD (keep the same main character exactly as described; this beat is beat_${beat.idx}):
${boards.map(boardLine).join('\n')}

THIS BEAT (required): ${boardLine(boards[beat.idx] ?? null, beat.idx)}

COMPOSITION (non-negotiable):
- 9:16 vertical. Subject centered or slightly above center. The LOWER THIRD calm and simple (floor, ground, surface): say
  what fills it ("open studio floor below"); never write layout rules.
- Screens and phones at an angle or from behind, no readable interface.
- Realistic: real products in real colors and materials, natural proportions, nothing out of place.
- Products and packaging are plain, with no invented brand names, logos or lettering on them.
- Bright, well-exposed daylight. Never night, dusk, moody, neon or cinematic light.

MOTION: "motion_hint" one of static | slow_zoom_in | slow_zoom_out | pan_left | pan_right | ken_burns (hook: slow_zoom_in,
payoff: static). "motion_action": ONE sentence (8-20 words) of what visibly happens next at real-life speed, using only
people and objects in the photo. Never "slowly", "gently", "in slow motion".

Return JSON: {"image_prompt": string, "motion_hint": string, "motion_action": string}`;

const shotUser = (beat: ShortBeat, narration: string) => `FULL NARRATION: ${narration}

THIS BEAT'S LINE: "${beat.text}"

image_prompt: 50-90 words. Start with the shot type. The line's concrete action and objects MUST be in it (not a pose).
Describe the main character exactly as the storyboard does (age, look, outfit), the setting, the product as the
storyboard says, the lower third, the light. Never mention labels, signs, text, prices or numbers: name the object
itself. In a close-up, a person appears only as hands or a natural partial crop.`;

type RawShot = { image_prompt?: string; motion_hint?: string; motion_action?: string };

const planShot = async (beat: ShortBeat, narration: string, inputs: ShortInputs, bible: VisualBible, boards: (ShotBoard | null)[], meter: CostMeter): Promise<ShortBeat> => {
  const raw = await creativeJson<RawShot>(shotSystem(beat, inputs, bible, boards), shotUser(beat, narration), meter, 'Shot plan', smartModel());
  const rawPrompt = (raw.image_prompt ?? beat.text).trim();
  const motion = MOTIONS.includes(raw.motion_hint as MotionHint) ? (raw.motion_hint as MotionHint) : beat.role === 'payoff' ? 'static' : 'slow_zoom_in';
  const action = raw.motion_action?.trim().replace(/\b(very )?(slowly|gently|gracefully|in slow motion|slow-motion)\b/gi, '').replace(/\s{2,}/g, ' ');
  const board = boards[beat.idx] ?? undefined;
  return { ...beat, rawImagePrompt: rawPrompt, imagePrompt: sanitizeImagePrompt(rawPrompt), motionHint: motion, motionAction: action || undefined, board };
};

/** The storyboard first (one call), then every beat's shot plan in parallel, all sharing the bible and the storyboard. */
export const planBibleVisuals = async (beats: ShortBeat[], narration: string, inputs: ShortInputs, bible: VisualBible, meter: CostMeter): Promise<ShortBeat[]> => {
  const boards = await planStoryboard(beats, bible, inputs, meter);
  return Promise.all(beats.map((b) => planShot(b, narration, inputs, bible, boards, meter)));
};

/** The main character as the storyboard describes them, or null when no beat has a person. */
const mainCharacter = (beats: ShortBeat[]): string | null =>
  beats.map((b) => b.board?.person ?? '').find((p) => p && !/^no person/i.test(p)) ?? null;

const isVehicle = (bible: VisualBible) => /\b(car|cars|vehicle|automotive|auto|suv|truck|motorcycle)\b/i.test(`${bible.business_category} ${bible.hero_product}`);

/** The anchor photo: the main character beside (or wearing) the hero product, full body, plain bright setting. */
export const anchorPrompt = (bible: VisualBible, beats: ShortBeat[]): string => {
  const person = mainCharacter(beats);
  const product = isVehicle(bible)
    ? `standing beside ${bible.hero_product}, the whole car visible from front three-quarter`
    : `with ${bible.hero_product}, clearly visible`;
  const subject = person ? `${person}, ${product}` : `${bible.hero_product}, the whole product clearly visible`;
  return `Vertical reference photo, full-body, eye level: ${subject}. Plain bright neutral setting, ${bible.visual_style.replace(/\.$/, '')}. Whole body anatomically complete, feet on the ground. No text overlays, no invented logos.`;
};

/** Added to every beat's photo prompt when the anchor goes along as a reference image. */
export const referenceNote = (bible: VisualBible): string =>
  `Reference image: keep the SAME person (face, hair, build, skin tone) and the SAME ${bible.hero_product} as in the reference. Change the place, pose, framing and action as described here: a different pose and framing from the reference.`;

/** The image model's prompt for a bible short: the shot, the brand's photo style, and the reference note when there is one. */
export const biblePhotoPrompt = (beat: ShortBeat, bible: VisualBible, withReference: boolean): string =>
  [
    `${(beat.imagePrompt ?? beat.text).replace(/\.$/, '')}.`,
    `Photographic style: ${bible.visual_style.replace(/\.$/, '')}. True-to-life colors, natural skin texture, vertical framing. No text overlays, no watermarks, no readable screens.`,
    withReference ? referenceNote(bible) : '',
  ]
    .filter(Boolean)
    .join(' ');
