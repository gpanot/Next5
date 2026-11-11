// server-only — never import from a 'use client' file.
// The two chat boxes of the hand-made Brand Cast wizard: the owner's words change the story's text, or the first
// photo's scene. One model call each; both keep the shape they were given.

import type { AutoSlide } from '../../../types/admin/autoSlideshow';
import type { CostMeter } from '../../metaAds/cost';
import { HttpError } from '../../http';
import { creativeJson } from '../../shorts/llm';

type Slide = Omit<AutoSlide, 'imageKey'>;

/** Longest request the chat box sends. */
export const MAX_REQUEST = 500;

const STORY_SYSTEM = `You edit a TikTok photo slideshow for a small business, as its owner asks. Apply the REQUEST and
keep everything it does not touch. Rules:
- Same number of slides, in the same order: slide 1 is the hook, the last slide is the call to action.
- Plain words a 9-year-old reads easily. Short lines: a title is 3-12 words, a body is at most 30 words.
- The hook slide has no body: keep its body empty.
- Only the last slide may name the brand or its product; the other slides give value, not an ad.
- Keep the main person's name and pronouns unless the request changes them.
Return JSON with flat keys only: "slide_N_title" and "slide_N_body" for each slide N (1 = first slide).`;

const SCENE_SYSTEM = `You change the photo idea behind the first slide of a TikTok slideshow, as the owner asks. Apply
the REQUEST and keep the rest of the scene (the person, the action, the real-life place) unless the request changes it.
Shot type, action, place and light in one sentence of at most 40 words. Call the person "the main person". When the
scene has sentences about the main person's look or clothes ("The main person: ...", "Wearing ..."), keep them word for
word after your sentence, unless the request changes them. Return JSON with one flat key: "scene".`;

const clean = (v: unknown, fallback: string) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : fallback);

/** The owner's request, trimmed; 400 when empty. */
export const requestOf = (value: unknown): string => {
  const text = typeof value === 'string' ? value.trim().slice(0, MAX_REQUEST) : '';
  if (!text) throw new HttpError(400, 'empty_request', 'Write what you want to change.');
  return text;
};

/** The story with the owner's change applied. Throws 502 when the model call fails, so the story stays as it was. */
export const reviseStory = async (slides: Slide[], request: string, meter: CostMeter): Promise<Slide[]> => {
  const user = `REQUEST: ${request}\nSLIDES:\n${slides.map((s, i) => `${i + 1}. title: ${s.title}\n   body: ${s.body}`).join('\n')}`;
  let raw: Record<string, unknown>;
  try {
    raw = await creativeJson<Record<string, unknown>>(STORY_SYSTEM, user, meter, 'Manual story edit');
  } catch (err) {
    console.warn('[manual-slideshow] story edit failed:', err instanceof Error ? err.message.slice(0, 200) : err);
    throw new HttpError(502, 'rewrite_failed', 'Could not change the story. Try again.');
  }
  return slides.map((s, i) => {
    const title = clean(raw[`slide_${i + 1}_title`], s.title) || s.title;
    const body = s.role === 'hook' ? '' : clean(raw[`slide_${i + 1}_body`], s.body);
    return { ...s, title: title.slice(0, 120), body: body.slice(0, 220) };
  });
};

/** The first photo's scene with the owner's change; on a failed call, the request added to the old scene. */
export const reviseScene = async (scene: string, request: string, meter: CostMeter): Promise<string> => {
  try {
    const raw = await creativeJson<Record<string, unknown>>(SCENE_SYSTEM, `REQUEST: ${request}\nSCENE: ${scene}`, meter, 'Manual photo edit');
    const next = clean(raw.scene, '');
    if (next) return next.slice(0, 1500);
  } catch (err) {
    console.warn('[manual-slideshow] scene edit failed, request appended:', err instanceof Error ? err.message.slice(0, 200) : err);
  }
  return `${scene} Change: ${request}`;
};
