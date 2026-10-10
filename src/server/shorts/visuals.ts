// server-only — never import from a 'use client' file.
// One planner call per beat: the photo prompt, the camera move and the evidence item it stands on.
// Prompt ported from reels-af visual.py (the simpler images of the 2026-10-06 batch), with these changes:
//  - the shot shows its evidence item's subject, never its number: prices drawn in photos clashed with the captions;
//  - bright daylight only (Next5 slideshow look), whatever the mood guidance says;
//  - the subject sits above our captions (lower third), not reels-af's empty top;
//  - no forced "unexpected element": it added unrealistic props (a lime-green golf shaft) to every shot;
//  - 2026-10-08: the content guidelines' documentary, teaching look (guidelines.ts), and each beat gets its own shot type
//    (wide, close-up, hands, over-the-shoulder…): the user found the photos of one short all looked the same.
// The prompt is then cleaned in code as a backstop: any clause that would put text in the image is dropped (only the
// clause, not its sentence: dropping whole sentences removed the shot's subject on 2026-10-06).

import type { CostMeter } from '../metaAds/cost';
import type { MotionHint, ShortBeat, ShortInputs } from '../../types/admin/shorts';
import { planCast, type BeatCast } from './cast';
import { VISUAL_RULES } from './guidelines';
import { creativeJson, smartModel } from './llm';

export const MOTIONS: MotionHint[] = ['static', 'slow_zoom_in', 'slow_zoom_out', 'pan_left', 'pan_right', 'ken_burns'];

/** One framing per beat, in turn, so consecutive shots never look alike. */
const SHOT_TYPES = [
  'MEDIUM SHOT of a real person in their workplace, eye level, doing the thing the line is about',
  'EXTREME CLOSE-UP of the key object or detail (hands, tool, material, document edge), shallow depth of field',
  'OVER-THE-SHOULDER shot of someone working on the subject, their back and shoulder framing it',
  'WIDE ESTABLISHING shot of the place where this happens, people small in the frame',
  'TOP-DOWN overhead shot of a desk, table or surface with the real objects laid out',
  'CANDID TWO-PERSON moment: one explaining or showing something to the other',
  'LOW ANGLE or side profile of a person mid-action, natural window light',
] as const;

export const shotTypeFor = (idx: number): string => SHOT_TYPES[idx % SHOT_TYPES.length];

const ROLE_BLOCK: Record<ShortBeat['role'], string> = {
  hook: 'ROLE: HOOK — this is the FIRST beat. It must be the most arresting visual in the reel — biggest stop-the-scroll energy. Strong subject, high contrast, one striking but REAL detail (an unusual angle, a tight close-up, a moment of action). Lean toward slow_zoom_in (a short push in) so the frame keeps revealing as the hook lands.',
  payoff: 'ROLE: PAYOFF — this is the LAST beat. Visually CALLBACK the hook when possible: same subject reframed, same location after a moment, or the same object completed. Lean toward `static` so the final image holds and the viewer loops back to the top of the reel.',
  mechanism: 'ROLE: MECHANISM — this is a BODY beat. Illustrate concretely WHAT THIS NARRATIVE LINE SAYS. Not mood — the actual thing. Vary motion across body beats; pick the move that reveals what the line claims.',
};

const castBlock = (cast: BeatCast | null) =>
  cast
    ? `SETTING AND PERSON FOR THIS BEAT (required; the other beats use different ones):\n  Setting: ${cast.setting}\n  Person: ${cast.person}`
    : 'Use a different setting, person or object from the other beats unless this is the payoff calling back the hook.';

const system = (beat: ShortBeat, inputs: ShortInputs, cast: BeatCast | null) => `You are planning the visual for ONE beat of a 20-40 second vertical reel.

This is beat ${beat.idx} (~${beat.spanS.toFixed(1)}s of audio).

${ROLE_BLOCK[beat.role]}

MODE: EDUCATIONAL (${inputs.domain}). The reel teaches one lesson; this frame shows the concrete thing THIS line explains —
a real object, place, action or moment — not a generic mood for the topic. No stock-photo handshakes, no people smiling
at the camera. ${VISUAL_RULES}

SHOT TYPE FOR THIS BEAT (required, so the shots of the reel look different from each other):
  ${shotTypeFor(beat.idx)}

${castBlock(cast)}

COMPOSITION (non-negotiable):
- 9:16 vertical frame. Subject centered or slightly above center.
- Keep the LOWER THIRD calm and simple (floor, grass, table surface, soft background) — big burned captions sit there.
  Put faces, hands at work and key details higher. In image_prompt, say what fills the lower third (e.g. "open turf
  below"); never write layout rules like "no hands in the lower third" (the image model reads them literally).
- Screens, phones and laptops: show them at an angle or from behind, so no interface text is readable.
- Everything in the frame must be realistic and belong in the scene: real products in their real colors, real
  materials, nothing out of place. Never add a random prop or a recolored object to catch the eye.
- No text, letters, captions, or watermarks IN the image — subtitles are added later in post.

GROUNDING:
- visual_anchor MUST be one of the evidence items listed below, copied verbatim.
- image_prompt SHOWS the anchor's subject (the product, place, person or object it is about) — NEVER its number, price
  or any figure. Numbers and prices drawn in the photo clash with the on-screen captions. No price tags, boards, signs,
  screens or papers showing figures.

MOTION HINT — pick what serves THIS beat:
- \`static\` (payoff), \`slow_zoom_in\` (hook / revealing detail), \`slow_zoom_out\` (widen scope), \`pan_left\`,
  \`pan_right\`, \`ken_burns\` (slow pan + zoom on a still subject).
Default policy: hook → slow_zoom_in; payoff → static; mechanism → vary (zoom_out / pan / ken_burns).

BRAND PHOTO RULES (override any mood guidance above): every image is a bright, well-exposed DAYLIGHT photo. Never night,
dusk, dark, moody, neon, glowing holograms, sparkles, spotlight or 'cinematic' lighting. Brand look: ${inputs.photoStyle || 'clean, modern, true to the brand'}

REEL ESSENCE:
  core claim : ${inputs.coreClaim}
  evidence   :
${(inputs.evidence ?? []).map((e, i) => `    ${i + 1}. ${e}`).join('\n')}

MOTION ACTION — the photo becomes the first frame of a short video clip. In "motion_action", write ONE sentence (8-20
words) of what visibly happens in the next few seconds at REAL-LIFE SPEED, as if filmed on a phone: ordinary, brisk,
everyday movements (she types a line and glances up; he picks up the box and turns it over). Never "slowly", "gently",
"gracefully", "in slow motion" or dreamy floating. A beat with no person: what moves naturally (steam, a hand, traffic).
Use ONLY people and objects your image_prompt puts in the frame: never pick up, open or reveal something that is not in
the photo (a phone that is not on the desk would pop out of nowhere).

Return JSON with exactly these keys: {"image_prompt": string, "motion_hint": string, "motion_action": string, "visual_anchor": string}`;

const user = (beat: ShortBeat, narration: string) => `FULL REEL NARRATION (for global context — pick a visual that fits the arc, distinct from other beats):
${narration}

THIS IS THE NARRATIVE LINE FOR THIS BEAT — the visual MUST match:
  "${beat.text}"

Beat meta: idx ${beat.idx} · role ${beat.role} · ${beat.spanS.toFixed(2)} s

image_prompt — 40-80 words. Start with the shot type. 9:16 vertical, subject centered or slightly above center, calm
lower third for captions, the concrete subject of this line (never its figures), everything realistic. Specific
subject, setting, framing, light.`;

type RawVisual = { image_prompt?: string; motion_hint?: string; motion_action?: string; visual_anchor?: string };

const TEXT_WORDS =
  /\b(text|texts|words?|writing|written|letters?|lettering|labels?|labell?ed|signs?|signage|price ?tags?|tags?|typography|captions?|banners?|posters?|billboards?|headlines?|numbers?|digits?|figures?|fonts?|logos?|readable|reads|says|watermarks?|board)\b/i;
/** "with no readable text…", "so no lettering shows": a negation running to the end of its clause. */
const NEGATION_TAIL = /\s*\b(?:(?:so|and|with|but)\s+)?(?:no|without|free of)(?![\w-]).*$/i;
/** A bare item continuing a negated list ("no numbers, price tags, papers"): at most 4 words, no verb-like -ing/-ed. */
const LIST_ITEM = /^(?:(?:or|and)\s+)?(?:[\w’'-]+\s+){0,3}[\w’'-]+[,;]?$/i;
const MONEY = /(\$|€|£)\s?\d[\d,.]*\s?(k|m|million|billion)?|\b\d[\d,.]*\s?(%|(percent|dollars?|usd)\b)|\b\d{1,3}(,\d{3})+\b/gi;

/**
 * One clause (a piece between commas or semicolons) without text in it: the planner's own "no text / no labels"
 * negations are cut (the image prompt adds its own), and a clause that still asks for text is dropped.
 * `negated`: the clause before ended in a cut negation, so a bare list item here belongs to it.
 */
const cleanClause = (clause: string, negated: boolean): { text: string; negated: boolean } => {
  const end = /[,;]$/.test(clause) ? clause.slice(-1) : '';
  let body = end ? clause.slice(0, -1) : clause;
  if (negated && LIST_ITEM.test(body.trim()) && !/(ing|ed)$/i.test(body.trim())) return { text: '', negated: true };
  const tail = body.match(NEGATION_TAIL)?.[0] ?? '';
  const cut = Boolean(tail && TEXT_WORDS.test(tail));
  if (cut) body = body.slice(0, body.length - tail.length);
  const drop = !body.trim() || TEXT_WORDS.test(body) || /["“”«»]/.test(body);
  return { text: drop ? '' : body + end, negated: cut };
};

const cleanSentence = (sentence: string): string => {
  const stop = /[.!?]$/.test(sentence) ? sentence.slice(-1) : '';
  const kept: string[] = [];
  let negated = false;
  for (const clause of (stop ? sentence.slice(0, -1) : sentence).split(/(?<=[,;])\s+/)) {
    const out = cleanClause(clause, negated);
    negated = out.negated;
    if (out.text) kept.push(out.text);
  }
  if (!kept.length) return '';
  return `${kept.join(' ').replace(/[,;:\s]+$/, '')}${stop || '.'}`;
};

/** The prompt with every clause that would put text in the image dropped, and money/percent figures removed. */
export const sanitizeImagePrompt = (prompt: string): string => {
  const sentences = prompt.replace(/\btext-free\b/gi, 'blank').split(/(?<=[.!?])\s+/);
  const kept = sentences.map(cleanSentence).filter(Boolean);
  return (kept.length ? kept : sentences.slice(0, 1))
    .join(' ')
    .replace(MONEY, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/** Documentary photo look (content guidelines), bright (Auto Slideshow: "cinematic" light made photos dark). */
const PHOTO_STYLE =
  'Candid documentary photo taken on a phone, bright natural daylight, true-to-life colors, real place with slight everyday imperfection, natural proportions, vertical framing. Not an advertisement, not a commercial or studio shot. No text overlays, no watermarks, no readable screen text.';

/** What the image model gets: the cleaned shot + the documentary look + the brand look. */
export const photoPrompt = (beat: ShortBeat, inputs: ShortInputs): string =>
  [`${(beat.imagePrompt ?? beat.text).replace(/\.$/, '')}.`, PHOTO_STYLE, inputs.photoStyle && `Brand colors and mood only (the setting above stays): ${inputs.photoStyle}`].filter(Boolean).join(' ');

const planBeat = async (beat: ShortBeat, narration: string, inputs: ShortInputs, cast: BeatCast | null, meter: CostMeter): Promise<ShortBeat> => {
  const raw = await creativeJson<RawVisual>(system(beat, inputs, cast), user(beat, narration), meter, 'Shot plan', smartModel());
  const rawPrompt = (raw.image_prompt ?? beat.text).trim();
  const motion = MOTIONS.includes(raw.motion_hint as MotionHint) ? (raw.motion_hint as MotionHint) : beat.role === 'payoff' ? 'static' : 'slow_zoom_in';
  const action = raw.motion_action?.trim().replace(/\b(very )?(slowly|gently|gracefully|in slow motion|slow-motion)\b/gi, '').replace(/\s{2,}/g, ' ');
  return { ...beat, rawImagePrompt: rawPrompt, imagePrompt: sanitizeImagePrompt(rawPrompt), motionHint: motion, motionAction: action || undefined, visualAnchor: raw.visual_anchor?.trim() };
};

/** The cast and settings first (one call), then every beat's shot plan in parallel. */
export const planVisuals = async (beats: ShortBeat[], narration: string, inputs: ShortInputs, meter: CostMeter): Promise<ShortBeat[]> => {
  const cast = await planCast(beats, inputs, meter);
  return Promise.all(beats.map((b, i) => planBeat(b, narration, inputs, cast[i] ?? null, meter)));
};

/**
 * Camera moves as a phone camera operator does them. The planner's hints keep their stored names, but "slow zoom in" in
 * the prompt made every clip look like 0.75-0.85× slow motion (user feedback 2026-10-08).
 */
const CAMERA: Record<MotionHint, string> = {
  static: 'Camera: locked off on a tripod, no camera movement',
  slow_zoom_in: 'Camera: handheld phone, a short push in',
  slow_zoom_out: 'Camera: handheld phone, a short pull back',
  pan_left: 'Camera: handheld phone, pans left',
  pan_right: 'Camera: handheld phone, pans right',
  ken_burns: 'Camera: handheld phone, natural small drift',
};

/** Always added: the clip plays at the speed of real life. */
const REAL_TIME =
  'Real-time speed: people and things move at normal everyday pace, like an unedited phone video of real life. No slow motion, no time-lapse, no dreamy floating movement.';

/** The video prompt: the shot, what happens in it, the camera, and real-time speed. */
export const videoPrompt = (beat: ShortBeat): string =>
  [
    `${(beat.imagePrompt ?? beat.text).replace(/\.$/, '')}.`,
    beat.motionAction ? `Action: ${beat.motionAction.replace(/\.$/, '')}.` : '',
    `${CAMERA[beat.motionHint ?? 'slow_zoom_in']}.`,
    REAL_TIME,
  ]
    .filter(Boolean)
    .join(' ');
