// server-only — never import from a 'use client' file.
// One planner call per beat: the photo prompt, the camera move and the evidence item it stands on.
// Prompt ported from reels-af visual.py (the simpler images of the 2026-10-06 batch), with four changes:
//  - the shot shows its evidence item's subject, never its number: prices drawn in photos clashed with the captions;
//  - bright daylight only (Next5 slideshow look), whatever the mood guidance says;
//  - the subject sits above our captions (lower third), not reels-af's empty top;
//  - no forced "unexpected element": it added unrealistic props (a lime-green golf shaft) to every shot.
// The prompt is then cleaned in code as a backstop: any clause that would put text in the image is dropped (only the
// clause, not its sentence: dropping whole sentences removed the shot's subject on 2026-10-06).

import type { CostMeter } from '../metaAds/cost';
import type { MotionHint, ShortBeat, ShortInputs } from '../../types/admin/shorts';
import { BRIGHT_STYLE } from './brand';
import { creativeJson } from './llm';

const MOTIONS: MotionHint[] = ['static', 'slow_zoom_in', 'slow_zoom_out', 'pan_left', 'pan_right', 'ken_burns'];

const ROLE_BLOCK: Record<ShortBeat['role'], string> = {
  hook: 'ROLE: HOOK — this is the FIRST beat. It must be the most arresting visual in the reel — biggest stop-the-scroll energy. Strong subject, high contrast, one striking but REAL detail (an unusual angle, a tight close-up, a moment of action). Lean toward slow_zoom_in so the frame keeps revealing as the hook lands.',
  payoff: 'ROLE: PAYOFF — this is the LAST beat. Visually CALLBACK the hook when possible: same subject reframed, same location after a moment, or the same object completed. Lean toward `static` so the final image holds and the viewer loops back to the top of the reel.',
  mechanism: 'ROLE: MECHANISM — this is a BODY beat. Illustrate concretely WHAT THIS NARRATIVE LINE SAYS. Not mood — the actual thing. Vary motion across body beats; pick the move that reveals what the line claims.',
};

const system = (beat: ShortBeat, inputs: ShortInputs) => `You are planning the visual for ONE beat of a ~25-second vertical reel.

This is beat ${beat.idx} (~${beat.spanS.toFixed(1)}s of audio).

${ROLE_BLOCK[beat.role]}

MODE: GENERAL (${inputs.domain}). Editorial imagery. The frame must convey ONE specific thing this reel is about — a named
product, place, object, or moment — not a generic mood for the topic. No stock-photo handshakes. Pick a concrete scene
grounded in the evidence list.

COMPOSITION (non-negotiable):
- 9:16 vertical frame. Subject centered or slightly above center.
- Keep the LOWER THIRD calm and simple (floor, grass, table surface, soft background) — big burned captions sit there.
  Put faces, hands at work and key details higher. In image_prompt, say what fills the lower third (e.g. "open turf
  below"); never write layout rules like "no hands in the lower third" (the image model reads them literally).
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
dusk, dark, moody, neon, spotlight or 'cinematic' lighting. Brand look: ${inputs.photoStyle || 'clean, modern, true to the brand'}

REEL ESSENCE:
  core claim : ${inputs.coreClaim}
  evidence   :
${(inputs.evidence ?? []).map((e, i) => `    ${i + 1}. ${e}`).join('\n')}

Return JSON with exactly these keys: {"image_prompt": string, "motion_hint": string, "visual_anchor": string}`;

const user = (beat: ShortBeat, narration: string) => `FULL REEL NARRATION (for global context — pick a visual that fits the arc, distinct from other beats):
${narration}

THIS IS THE NARRATIVE LINE FOR THIS BEAT — the visual MUST match:
  "${beat.text}"

Beat meta: idx ${beat.idx} · role ${beat.role} · ${beat.spanS.toFixed(2)} s

image_prompt — 9:16 vertical, subject centered or slightly above center, calm lower third for captions, the chosen
evidence item's subject (never its figures), everything realistic. Specific subject, framing, lighting, palette.`;

type RawVisual = { image_prompt?: string; motion_hint?: string; visual_anchor?: string };

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

/** What the image model gets: the cleaned shot + the Next5 bright look + the brand look (as in the test batch). */
export const photoPrompt = (beat: ShortBeat, inputs: ShortInputs): string =>
  `${(beat.imagePrompt ?? beat.text).replace(/\.$/, '')}. ${BRIGHT_STYLE} No text overlays, no watermarks. ${inputs.photoStyle}`.trim();

const planBeat = async (beat: ShortBeat, narration: string, inputs: ShortInputs, meter: CostMeter): Promise<ShortBeat> => {
  const raw = await creativeJson<RawVisual>(system(beat, inputs), user(beat, narration), meter, 'Shot plan');
  const rawPrompt = (raw.image_prompt ?? beat.text).trim();
  const motion = MOTIONS.includes(raw.motion_hint as MotionHint) ? (raw.motion_hint as MotionHint) : beat.role === 'payoff' ? 'static' : 'slow_zoom_in';
  return { ...beat, rawImagePrompt: rawPrompt, imagePrompt: sanitizeImagePrompt(rawPrompt), motionHint: motion, visualAnchor: raw.visual_anchor?.trim() };
};

export const planVisuals = (beats: ShortBeat[], narration: string, inputs: ShortInputs, meter: CostMeter): Promise<ShortBeat[]> =>
  Promise.all(beats.map((b) => planBeat(b, narration, inputs, meter)));

/** reels-af's video prompt: the shot plus one camera clause. */
export const videoPrompt = (beat: ShortBeat): string => {
  const hint = beat.motionHint ?? 'slow_zoom_in';
  return `${(beat.imagePrompt ?? beat.text).replace(/\.$/, '')}. ${hint === 'static' ? 'Camera: static, no movement' : `Camera: ${hint.replace(/_/g, ' ')}`}.`;
};
