// server-only — never import from a 'use client' file.
// Turn one read slideshow into a reusable model: the structure (hook, meat, CTA patterns with [slots]), never the
// creator's own lines. When an existing model already has this structure, the post becomes one more example of it.

import {
  HOOK_ARCHETYPES,
  SLIDESHOW_FORMATS,
  type HookArchetype,
  type ReferenceSlide,
  type ReferenceStats,
  type SlideshowFormat,
  type SlideshowPattern,
} from '../../types/admin/slideshowKnowledge';
import type { CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';
import { clip } from '../metaAds/text';

export type KnownModel = { id: string; name: string; pattern: SlideshowPattern };

export type ModelDraft = { sameAsModelId: string | null; name: string; niches: string[]; pattern: SlideshowPattern };

const SYSTEM = `You study a proven TikTok photo slideshow and write down its reusable structure, so a different business can
make a new slideshow with the same structure. Alex Hormozi's frame: hook (the promise) → meat (the value) → CTA.
Rules:
- hookPattern: the hook's words only, with [slots] for what changes per business: [N], [niche], [audience], [result].
  Keep the words that make it work ("nobody tells", "cheat codes", "most players never learn"). No design notes here.
  Example: "7 Golf Cheat Codes" → "[N] [niche] Cheat Codes".
- itemPattern: the shape of one meat slide, never its content: title length and voice, body length, what the body holds
  (a number, a fix, a comparison). Example: "Title: 3-6 word blunt correction in Title Case. Body: one plain line with a concrete fix or number."
- ctaPattern: the CTA's words with [slots] ([App], [product], [proof]), then the proof line's shape. No design notes.
- format: one of ${SLIDESHOW_FORMATS.join(', ')}
- hookArchetype: one of ${HOOK_ARCHETYPES.join(', ')}. curiosity = secrets, cheat codes, "nobody tells you", open loops;
  contrarian = myth or "stop doing"; proof_result = the hook states a result already achieved ("I dropped 10 strokes");
  fear_inaction = cost of a mistake; call_out = names the audience ("Beginners:"); action = a challenge.
- itemCount: number of meat slides between hook and CTA.
- visualRules: 3-5 short rules a designer can follow: text style, photo style, what never appears, where the brand shows.
- captionStyle: one short line.
- whyItWorks: 2 plain sentences.
- name: short model name, max 6 words, no niche words (e.g. "N cheat codes listicle").
- niches: 1-3 plain lowercase topic words with spaces, not hashtags (e.g. "golf", "mobile apps").
- sameAsModelId: the id of a known model with the SAME structure, else null. Same structure = same format, same meat slide
  shape, same CTA shape, item count within 2. The hook's wording may differ ("cheat codes" vs "tips nobody tells" is the
  same model with another hook), and so may the topic.
Return JSON: {"sameAsModelId","name","niches","pattern":{"format","hookPattern","hookArchetype","itemCount","itemPattern","ctaPattern","visualRules","captionStyle","whyItWorks"}}`;

const describe = (slides: ReferenceSlide[]) =>
  slides.map((s) => `${s.index + 1}. [${s.role}] title: "${s.title}" | body: "${s.body}" | text: ${s.textStyle} | photo: ${s.photo}`).join('\n');

const known = (models: KnownModel[]) =>
  models.length === 0
    ? '(none yet)'
    : models.map((m) => `- id ${m.id}: "${m.name}" · ${m.pattern.format} · hooks "${[m.pattern.hookPattern, ...(m.pattern.hookVariants ?? [])].join('" / "')}" · ${m.pattern.itemCount} items: ${m.pattern.itemPattern} · CTA: ${m.pattern.ctaPattern}`).join('\n');

type RawPattern = Partial<Record<keyof SlideshowPattern, unknown>>;
type RawDraft = { sameAsModelId?: unknown; name?: unknown; niches?: unknown; pattern?: RawPattern };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.trim(), max) : '');
const list = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => clip(x.trim(), maxLen)).slice(0, maxItems) : [];

const toPattern = (raw: RawPattern, slides: ReferenceSlide[]): SlideshowPattern => {
  const itemSlides = slides.filter((s) => s.role === 'item').length;
  const count = Math.round(Number(raw.itemCount));
  return {
    format: ((SLIDESHOW_FORMATS as readonly unknown[]).includes(raw.format) ? raw.format : 'other') as SlideshowFormat,
    hookPattern: str(raw.hookPattern, 160),
    hookVariants: [],
    hookArchetype: ((HOOK_ARCHETYPES as readonly unknown[]).includes(raw.hookArchetype) ? raw.hookArchetype : 'curiosity') as HookArchetype,
    itemCount: Number.isFinite(count) && count > 0 ? Math.min(count, 20) : itemSlides,
    itemPattern: str(raw.itemPattern, 300),
    ctaPattern: str(raw.ctaPattern, 200),
    visualRules: list(raw.visualRules, 6, 160),
    captionStyle: str(raw.captionStyle, 160),
    whyItWorks: str(raw.whyItWorks, 400),
  };
};

export const draftModel = async (
  input: { slides: ReferenceSlide[]; caption: string; stats: ReferenceStats; creator: string },
  models: KnownModel[],
  meter: CostMeter,
): Promise<ModelDraft> => {
  const { slides, caption, stats, creator } = input;
  const raw = await metaAdsJson<RawDraft>(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Known models:\n${known(models)}\n\nNew slideshow by @${creator}: ${stats.views} views, ${stats.saves} saves.\nCaption: ${clip(caption, 300) || '(none)'}\nSlides:\n${describe(slides)}`,
      },
    ],
    { maxTokens: 4_000, meter, label: 'OpenAI model draft' },
  );
  const pattern = toPattern(raw.pattern ?? {}, slides);
  if (!pattern.hookPattern || !pattern.itemPattern) throw new Error('The model draft is missing the hook or meat pattern');
  const sameAs = typeof raw.sameAsModelId === 'string' && models.some((m) => m.id === raw.sameAsModelId) ? raw.sameAsModelId : null;
  return { sameAsModelId: sameAs, name: str(raw.name, 60) || `${pattern.itemCount}-slide ${pattern.format}`, niches: list(raw.niches, 3, 30).map((n) => n.toLowerCase()), pattern };
};
