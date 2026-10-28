// server-only. Carousels: hooks for slide 1, the full carousel, and edits. Every answer is checked and cleaned here.
import type { CarouselHook, CarouselInput, CarouselSlide, GeneratedCarousel, RefineCarouselResult } from '../../types/admin/carousel';
import {
  CAROUSEL_QUESTIONS,
  CAROUSEL_TEMPLATES,
  carouselSlideCount,
  DEFAULT_LIST_COUNT,
  isCarouselTemplate,
  LIST_COUNTS,
  type CarouselQuestionKey,
} from '../../types/admin/carouselTemplates';
import { HOOK_ANGLES, type ScriptModel } from '../../types/admin/scriptGenerator';
import { HttpError } from '../http';
import { callClaude, type ToolDef } from './anthropic';
import {
  buildCarouselHooksSystem,
  buildCarouselRefineSystem,
  buildCarouselSystem,
  buildCarouselUser,
  CAROUSEL_EDIT_SCHEMA,
  CAROUSEL_HOOKS_SCHEMA,
  CAROUSEL_SCHEMA,
} from './carouselPrompts';
import { withOneRetry } from './generate';
import { stripDashes } from './normalize';
import { callOpenAi } from './openai';

const callModel = (model: ScriptModel, system: string, user: string, tool: ToolDef): Promise<unknown> =>
  model === 'claude' ? callClaude(system, user, tool) : callOpenAi(system, user, tool);

const bad = (message: string) => new HttpError(400, 'bad_request', message);
const invalid = (why: string) => new HttpError(502, 'SCRIPT_INVALID', 'The carousel came back in a shape we cannot use. Try again.', { why });
const clean = (value: unknown, max: number): string => (typeof value === 'string' ? stripDashes(value).slice(0, max) : '');
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

function parseHook(value: unknown): CarouselHook | undefined {
  if (value === undefined || value === null) return undefined;
  const h = obj(value);
  const angle = HOOK_ANGLES.find((a) => a === h.angle) ?? 'pain';
  const hook = { angle, text: clean(h.text, 200), photo: clean(h.photo, 400), bottomText: clean(h.bottomText, 200), bottomPhoto: clean(h.bottomPhoto, 400) };
  if (!hook.text) throw bad('Slide 1 needs text.');
  return hook;
}

/** Throws a 400 when the body is not a usable carousel request. Required answers must be filled. */
export function parseCarouselInput(body: Record<string, unknown>): CarouselInput {
  const { template } = body;
  if (!isCarouselTemplate(template)) throw bad('Unknown carousel template');
  const info = CAROUSEL_TEMPLATES[template];
  const raw = obj(body.answers);
  const answers: CarouselInput['answers'] = {};
  for (const key of info.questions) {
    const value = clean(raw[key], 1500).trim();
    if (CAROUSEL_QUESTIONS[key].required && !value) throw bad(`Please answer: ${CAROUSEL_QUESTIONS[key].title}`);
    if (value) answers[key as CarouselQuestionKey] = value;
  }
  const isList = info.type === 'numbered_list';
  const count = Number(body.listCount);
  const listCount = isList ? ((LIST_COUNTS as readonly number[]).includes(count) ? count : DEFAULT_LIST_COUNT) : undefined;
  const pronoun = template === 'split_to_be_her' ? (body.pronoun === 'him' ? 'him' : 'her') : undefined;
  const hook = info.fixedHook ? undefined : parseHook(body.hook);
  return { template, answers, ...(listCount ? { listCount } : {}), ...(pronoun ? { pronoun } : {}), ...(hook ? { hook } : {}) };
}

/** Coerces the model answer into a carousel with the template's slide count, or says why it cannot. */
export function normalizeCarousel(value: unknown, input: CarouselInput, exactCount = true): GeneratedCarousel {
  const raw = obj(value);
  const split = CAROUSEL_TEMPLATES[input.template].layout === 'split';
  const slides: CarouselSlide[] = (Array.isArray(raw.slides) ? raw.slides : []).map((s) => {
    const slide = obj(s);
    const base = { label: clean(slide.label, 60), text: clean(slide.text, 300), photo: clean(slide.photo, 400) };
    return split ? { ...base, bottomText: clean(slide.bottomText, 300), bottomPhoto: clean(slide.bottomPhoto, 400) } : base;
  });
  const want = carouselSlideCount(input.template, input.listCount);
  if (exactCount ? slides.length !== want : slides.length < 3) throw invalid(`${slides.length} slides, the template needs ${want}`);
  if (slides.some((s) => !s.text)) throw invalid('a slide has no text');
  return { title: clean(raw.title, 200) || 'Untitled carousel', template: input.template, slides, song: clean(raw.song, 500), caption: clean(raw.caption, 300), bioCta: clean(raw.bioCta, 200) };
}

/** Keeps well-formed slide 1 options with distinct angles. Fewer than 3 is an unusable answer. */
function validateHooks(value: unknown, split: boolean): CarouselHook[] {
  const raw = obj(value).hooks;
  const hooks: CarouselHook[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const h = obj(item);
    const angle = HOOK_ANGLES.find((a) => a === h.angle);
    const hook = { text: clean(h.text, 200), photo: clean(h.photo, 400), ...(split ? { bottomText: clean(h.bottomText, 200), bottomPhoto: clean(h.bottomPhoto, 400) } : {}) };
    if (angle && hook.text && hook.photo && !hooks.some((o) => o.angle === angle)) hooks.push({ angle, ...hook });
  }
  if (hooks.length < 3) throw new HttpError(502, 'invalid_hooks', 'The slide 1 options came back in a shape we cannot use. Try again.');
  return hooks.slice(0, 3);
}

export async function generateCarouselHooks(input: CarouselInput, model: ScriptModel): Promise<CarouselHook[]> {
  if (CAROUSEL_TEMPLATES[input.template].fixedHook) throw bad('This template has a fixed slide 1.');
  const tool: ToolDef = { name: 'submit_hooks', description: 'Submit the 3 options for slide 1.', input_schema: CAROUSEL_HOOKS_SCHEMA };
  const split = CAROUSEL_TEMPLATES[input.template].layout === 'split';
  return withOneRetry(async () => validateHooks(await callModel(model, buildCarouselHooksSystem(input), buildCarouselUser(input), tool), split));
}

export async function generateCarousel(input: CarouselInput, model: ScriptModel): Promise<GeneratedCarousel> {
  const tool: ToolDef = { name: 'submit_carousel', description: 'Submit the finished carousel.', input_schema: CAROUSEL_SCHEMA };
  return withOneRetry(async () => normalizeCarousel(await callModel(model, buildCarouselSystem(input), buildCarouselUser(input), tool), input));
}

/** Edits one carousel. The slide count may change when the instruction asks for it, so only a minimum is checked. */
export async function refineCarousel(input: CarouselInput, carousel: GeneratedCarousel, rawInstruction: unknown, model: ScriptModel): Promise<RefineCarouselResult> {
  const instruction = clean(rawInstruction, 500).trim();
  if (!instruction) throw bad('Write what to change.');
  const tool: ToolDef = { name: 'submit_edit', description: 'Submit the edited carousel, or refuse if the request is off topic.', input_schema: CAROUSEL_EDIT_SCHEMA };
  const data = (v: string) => v.replace(/[<>]/g, '');
  const user = `${buildCarouselUser(input)}\n<carousel>${data(JSON.stringify(carousel))}</carousel>\n<instruction>${data(instruction)}</instruction>`;
  return withOneRetry(async () => {
    const out = obj(await callModel(model, buildCarouselRefineSystem(input), user, tool));
    const message = clean(out.message, 300);
    if (out.refused === true) return { refused: true, message: message || 'I can only edit this carousel.', carousel };
    return { refused: false, message, carousel: normalizeCarousel(out.carousel, input, false) };
  });
}
