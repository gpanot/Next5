// server-only — never import from a 'use client' file.
// Step 4: write one slideshow on its model — hook from a proven hook pattern, meat slides in the model's shape, CTA with
// a claim the site proves. Tips are general know-how; any claim about the business must come from the site.

import type { AutoSlide, SlideshowPick } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { BrandLever } from '../../types/admin/metaAds';
import type { SlideshowPattern } from '../../types/admin/slideshowKnowledge';
import type { CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';
import { clip } from '../metaAds/text';

export type WrittenSlideshow = { slides: Omit<AutoSlide, 'photoIndex' | 'imageKey'>[]; caption: string; hashtags: string[] };

const SYSTEM = `You write one TikTok photo slideshow that copies a proven structure. Simple words a 10-year-old can read.
Structure: 1 hook slide, then exactly {N} meat slides, then 1 CTA slide.
- hook: fill the hook pattern's [slots] for this business's audience and topic. [N] is {N}. Title Case. Max 10 words. No body.
- hook.photo: one sentence describing the background photo that fits the hook best, so a viewer sees the hook's subject at once. Real-looking
  photography, bright daytime light, seen from behind or from the side, in the lower half of the frame with open sky or wall above. Never dusk, night, dim or moody light. Never text, logos, screens with UI, or close-up faces.
- meat slides: follow the meat pattern exactly (title length, voice, what the body holds). Each slide teaches one useful,
  correct, well-known thing about the topic. Body: ONE plain sentence, max 90 characters. No made-up statistics, studies or
  percentages about people. Never mention the business on meat slides, except for the product goal.
- goal: serve the slideshow's goal.
  teach → practical tips or steps. proof → the slides build toward a real result; any number comes only from "Proven claims".
  myth → each meat slide states a common belief, then the truth. story → one person's problem, turning point and result, in order.
  product → meat slides show what the product does and how to use it, using only facts from "Sells" and "Proven claims".
- cta: follow the CTA pattern's shape with the business's name and how people really get it. Say "download" or "App Store"
  only if "Sells" says it is an app; otherwise use the business's own path (join, book, try free, shop). The body may only
  use claims from "Proven claims" (reword lightly, keep every number exactly). Never copy numbers from the CTA pattern.
  No proven claims → a plain benefit from "Sells", with no numbers.
- caption: follow the caption style; hashtags: 3-6 lowercase tags without #, niche first.
Return JSON: {"hook":{"title","photo"},"items":[{"title","body"}],"cta":{"title","body"},"caption","hashtags":[string]}`;

type RawSlide = { title?: unknown; body?: unknown; photo?: unknown };
type Raw = { hook?: RawSlide; items?: RawSlide[]; cta?: RawSlide; caption?: unknown; hashtags?: unknown };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

/** Numbers and ranges as written: "2–5", "1,200", "4.9". */
const NUMBER_RE = /\d[\d,.]*(?:\s*[–—-]\s*\d[\d,.]*)?/g;

const normalizeNumbers = (text: string) => text.replace(/\s*[–—-]\s*(?=\d)/g, '-');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every number or range in the CTA must appear, whole, in a proven claim or on the site. Whole means with digit boundaries:
 * "2-5" is not found inside "12-50", and "5" alone is not proof of "save 2-5 strokes".
 */
export const ctaBodyIsProven = (body: string, levers: BrandLever[], siteText: string): boolean => {
  const proof = normalizeNumbers(`${levers.map((l) => `${l.claim} ${l.quote}`).join(' ')} ${siteText}`);
  const numbers = normalizeNumbers(body).match(NUMBER_RE) ?? [];
  return numbers.every((n) => new RegExp(`(?<![\\d.,-])${escape(n.replace(/[.,]$/, ''))}(?![\\d]|-\\d|[.,]\\d)`).test(proof));
};

/** "Download" / "App Store" only for a business whose own site talks about an app. */
export const ctaFitsBusiness = (cta: string, siteText: string): boolean =>
  !/\b(download|app store|google play)\b/i.test(cta) || /\bapps?\b/i.test(siteText);

/** Proof for a CTA whose own line was rejected: the site's strongest proven claim, or nothing. */
const provenLine = (levers: BrandLever[]): string => (levers.find((l) => l.criterion === 'proof') ?? levers.find((l) => l.criterion === 'dreamOutcome'))?.claim ?? '';

/** The proven slideshows keep meat text to one short line. */
const MAX_BODY = 110;

/** The hook's first number must be the slide count, or the promise and the slides disagree. */
export const hookMatchesCount = (hook: string, count: number): boolean => {
  const first = hook.match(/\d+/)?.[0];
  return first === undefined || Number(first) === count;
};

const toSlideshow = (raw: Raw, n: number, levers: BrandLever[], profile: BrandProfile): WrittenSlideshow | string => {
  const hook = str(raw.hook?.title, 120);
  const items = (raw.items ?? []).map((i) => ({ title: str(i.title, 90), body: str(i.body, 220) })).filter((i) => i.title);
  const hookPhoto = str(raw.hook?.photo, 400);
  const ctaTitle = str(raw.cta?.title, 120);
  let ctaBody = str(raw.cta?.body, 220);
  if (!hook) return 'no hook';
  if (items.length !== n) return `${items.length} meat slides instead of ${n}`;
  if (!hookMatchesCount(hook, n)) return `hook "${hook}" promises another number than ${n}`;
  if (!ctaTitle) return 'no CTA';
  const long = items.find((i) => i.body.length > MAX_BODY);
  if (long) return `meat body "${long.body}" is longer than one short line (max 90 characters)`;
  if (!ctaFitsBusiness(`${ctaTitle} ${ctaBody}`, profile.pageExcerpt)) return 'the CTA says download/App Store but the business is not an app';
  if (!ctaBodyIsProven(ctaBody, levers, profile.pageExcerpt)) ctaBody = provenLine(levers);
  const hashtags = Array.isArray(raw.hashtags)
    ? [...new Set(raw.hashtags.map((h) => str(h, 30).replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase()).filter(Boolean))].slice(0, 6)
    : [];
  return {
    slides: [
      { role: 'hook', title: hook, body: '', ...(hookPhoto ? { photoPrompt: hookPhoto } : {}) },
      ...items.map((i) => ({ role: 'item' as const, ...i })),
      { role: 'cta', title: ctaTitle, body: ctaBody },
    ],
    caption: str(raw.caption, 300),
    hashtags,
  };
};

const brief = (pick: SlideshowPick, pattern: SlideshowPattern, profile: BrandProfile, levers: BrandLever[]) =>
  [
    `Topic: ${pick.topic}`,
    `Goal: ${pick.goal ?? 'teach'}`,
    `Hook pattern: ${pick.hookPattern}`,
    `Meat pattern: ${pattern.itemPattern}`,
    `CTA pattern: ${pattern.ctaPattern}`,
    `Caption style: ${pattern.captionStyle}`,
    `\nBUSINESS: ${profile.brandName} (${profile.domain})`,
    `Sells: ${profile.valueProp}`,
    `Audience: ${profile.audience}`,
    `Tone: ${profile.tone}`,
    `Proven claims: ${levers.map((l) => `"${l.claim}"`).join(' · ') || 'none'}`,
  ].join('\n');

/** Writes one slideshow; a wrong slide count or hook number is retried once with the reason. */
export const writeSlideshow = async (
  input: { pick: SlideshowPick; pattern: SlideshowPattern; profile: BrandProfile; levers: BrandLever[] },
  meter: CostMeter,
): Promise<WrittenSlideshow> => {
  const { pick, pattern, profile, levers } = input;
  const n = pattern.itemCount;
  const system = SYSTEM.replaceAll('{N}', String(n));
  let problem = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const raw = await metaAdsJson<Raw>(
      [
        { role: 'system', content: system },
        { role: 'user', content: brief(pick, pattern, profile, levers) + (problem ? `\n\nYour last answer was rejected: ${problem}. Fix it.` : '') },
      ],
      { maxTokens: 5_000, meter, label: 'OpenAI slideshow copy' },
    );
    const result = toSlideshow(raw, n, levers, profile);
    if (typeof result !== 'string') return result;
    problem = result;
  }
  throw new Error(`Slideshow copy rejected 3 times: ${problem}`);
};
