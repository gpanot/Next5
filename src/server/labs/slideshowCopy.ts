// server-only — never import from a 'use client' file.
// Hook → Meat → CTA copy engine for real-estate slideshows.

import type { PhotoTag } from '../../lib/listingPhotos';
import { chatJsonWithMeta } from '../ai/openai';
import { hasFairHousingViolation } from './fairHousing';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReAngle = 'just_listed' | 'price_reduction' | 'open_house' | 'feature_highlight' | 'sold' | 'neighborhood';

export type ListingFacts = {
  address: string | null;
  city: string | null;
  state: string | null;
  /** Sale price in USD dollars (not cents). */
  priceUsd: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: string;
  daysOnMarket: number | null;
  /** ISO date string when it went on market, e.g. "2026-09-10T00:00:00.000Z". */
  onMarketDate: string | null;
  /** Array of price-history entries from Apify's listingPriceHistory field. */
  priceHistory: Array<{ date: string; event: string; price: number; priceChangeRate: number }> | null;
  /** True when Apify's listingType.isOpenHouse is true. */
  isOpenHouse: boolean;
  description: string | null;
};

export type SlideCopy = { role: 'hook' | 'meat' | 'cta'; text: string; photo: PhotoTag };

export type SlideshowCopy = {
  slides: SlideCopy[];
  caption: string;
  hashtags: string[];
  source: 'llm' | 'fallback';
};

// ── eligibleAngles ─────────────────────────────────────────────────────────────

const JUST_LISTED_DAYS = 30;

/** Price reduction: a "Price change" with negative rate after the last "Listed for sale" entry. */
const hasPriceReduction = (history: ListingFacts['priceHistory']): boolean => {
  if (!history?.length) return false;
  const lastListedIdx = history.findLastIndex((e) => e.event === 'Listed for sale');
  const recent = lastListedIdx >= 0 ? history.slice(0, lastListedIdx) : history;
  return recent.some((e) => e.event === 'Price change' && e.priceChangeRate < 0);
};

export const eligibleAngles = (facts: ListingFacts): ReAngle[] => {
  const angles: ReAngle[] = [];
  const status = facts.status;

  if (status === 'for_sale' || status === 'just_listed') {
    // Prefer daysOnMarket when present; fall back to onMarketDate; default to include.
    const withinWindow =
      facts.daysOnMarket !== null
        ? facts.daysOnMarket <= JUST_LISTED_DAYS
        : facts.onMarketDate !== null
          ? (Date.now() - new Date(facts.onMarketDate).getTime()) / 86_400_000 <= JUST_LISTED_DAYS
          : true; // unknown — include just_listed as safe default
    if (withinWindow) angles.push('just_listed');
  }

  if (hasPriceReduction(facts.priceHistory)) angles.push('price_reduction');
  if (facts.isOpenHouse) angles.push('open_house');
  if (status === 'sold') angles.push('sold');

  angles.push('feature_highlight');
  if (facts.city) angles.push('neighborhood');

  return angles;
};

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You write copy for a 5-slide vertical real estate slideshow (TikTok, Reels).
Structure is fixed: Hook -> Meat -> CTA.

RULES
Slide 1, HOOK: max 8 words. Must create curiosity or tension about this specific home. Use one pattern: a surprising number, "wait till you see X", a question the buyer is asking, or a contrast (price vs what you get). Never start with "Just listed" or the address. No exclamation marks on the hook.

Slides 2-4, MEAT: max 10 words each. One concrete fact per slide, taken from LISTING FACTS. Specific beats vague: "Quartz island seats 6" not "Beautiful kitchen". Each slide must name a photo tag that shows the fact. Order from most to least impressive.

Slide 5, CTA: max 7 words. One action only. For open_house: date and time. For sold: "Want results like this? DM me." Others: "DM me TOUR" or "Showings this week. Link in bio."

HARD LIMITS
- Every number, price, date and feature must appear in LISTING FACTS. If a fact is missing, don't mention it.
- Fair Housing: describe the property, never the people. No "perfect for families", "safe neighborhood", "great schools", "exclusive", "walk to church", or anything about who should live there.
- No emojis, no hashtags in slides, no exclamation marks on the hook.
- Plain English a buyer would say out loud.

Also write a caption (max 150 characters, ends with the CTA) and 3 to 5 hashtags using the city name.

Return only JSON:
{"slides":[{"role":"hook|meat|cta","text":"...","photo":"<tag>"}],"caption":"...","hashtags":["..."]}`;

const buildPrompt = (facts: ListingFacts, angle: ReAngle, photoTags: PhotoTag[]): string => {
  const lines = [
    `ANGLE: ${angle}`,
    `LISTING FACTS (the only facts you may use):`,
    JSON.stringify(facts, null, 2),
    `AVAILABLE PHOTOS (tags): ${[...new Set(photoTags)].join(', ')}`,
  ];
  return lines.join('\n');
};

// ── Static fallback table ─────────────────────────────────────────────────────

type FallbackSlide = { role: SlideCopy['role']; textFn: (f: ListingFacts) => string | null; photo: PhotoTag };

const FALLBACKS: Record<ReAngle, FallbackSlide[]> = {
  just_listed: [
    { role: 'hook', textFn: (f) => f.priceUsd ? `$${Math.round(f.priceUsd).toLocaleString('en-US')} in ${f.city ?? 'this market'}` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.beds && f.baths ? `${f.beds} beds, ${f.baths} baths` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.sqft ? `${f.sqft.toLocaleString('en-US')} square feet` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.daysOnMarket !== null ? `On market ${f.daysOnMarket} days` : null, photo: 'exterior' },
    { role: 'cta', textFn: () => 'DM me for a showing', photo: 'exterior' },
  ],
  price_reduction: [
    { role: 'hook', textFn: (f) => f.priceUsd ? `Price just dropped on this ${f.city ?? ''} home` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.priceUsd ? `Now listed at $${Math.round(f.priceUsd).toLocaleString('en-US')}` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.beds && f.baths ? `${f.beds} beds, ${f.baths} baths` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.sqft ? `${f.sqft.toLocaleString('en-US')} square feet` : null, photo: 'living' },
    { role: 'cta', textFn: () => 'Showings this week. Link in bio.', photo: 'exterior' },
  ],
  open_house: [
    { role: 'hook', textFn: (f) => `Open house coming up in ${f.city ?? 'the area'}`, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.priceUsd ? `Listed at $${Math.round(f.priceUsd).toLocaleString('en-US')}` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.beds && f.baths ? `${f.beds} beds, ${f.baths} baths` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.sqft ? `${f.sqft.toLocaleString('en-US')} square feet` : null, photo: 'living' },
    { role: 'cta', textFn: () => 'Come see it. DM me for details.', photo: 'exterior' },
  ],
  feature_highlight: [
    { role: 'hook', textFn: (f) => f.priceUsd ? `$${Math.round(f.priceUsd).toLocaleString('en-US')} buys you all of this` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.beds && f.baths ? `${f.beds} beds, ${f.baths} baths` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.sqft ? `${f.sqft.toLocaleString('en-US')} square feet` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.city ? `Located in ${f.city}` : null, photo: 'exterior' },
    { role: 'cta', textFn: () => 'DM me TOUR', photo: 'exterior' },
  ],
  sold: [
    { role: 'hook', textFn: (f) => `Just closed in ${f.city ?? 'the area'}`, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.priceUsd ? `Sold for $${Math.round(f.priceUsd).toLocaleString('en-US')}` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.beds && f.baths ? `${f.beds} beds, ${f.baths} baths` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.daysOnMarket !== null ? `Closed in ${f.daysOnMarket} days` : null, photo: 'exterior' },
    { role: 'cta', textFn: () => 'Want results like this? DM me.', photo: 'exterior' },
  ],
  neighborhood: [
    { role: 'hook', textFn: (f) => f.city ? `This is what ${f.city} looks like right now` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.priceUsd ? `Listed at $${Math.round(f.priceUsd).toLocaleString('en-US')}` : null, photo: 'exterior' },
    { role: 'meat', textFn: (f) => f.beds && f.baths ? `${f.beds} beds, ${f.baths} baths` : null, photo: 'living' },
    { role: 'meat', textFn: (f) => f.sqft ? `${f.sqft.toLocaleString('en-US')} square feet` : null, photo: 'living' },
    { role: 'cta', textFn: () => 'DM me TOUR', photo: 'exterior' },
  ],
};

const buildFallback = (facts: ListingFacts, angle: ReAngle): SlideshowCopy => {
  const templates = FALLBACKS[angle];
  const slides: SlideCopy[] = [];
  let fallbackText = 'Check out this listing';

  for (const tmpl of templates) {
    if (slides.length >= 5) break;
    const text = tmpl.textFn(facts);
    if (text) {
      slides.push({ role: tmpl.role, text, photo: tmpl.photo });
      fallbackText = text;
    }
  }

  // Pad to 5 slides if needed
  while (slides.length < 5) {
    const last = slides[slides.length - 1];
    slides.push({ role: 'cta', text: last?.text ?? fallbackText, photo: last?.photo ?? 'exterior' });
  }

  const caption = `${facts.address ?? (facts.city ? `Home in ${facts.city}` : 'New listing')} — DM for details`.slice(0, 150);
  const hashtags = facts.city
    ? [`#${facts.city.replace(/\s+/g, '')}RealEstate`, '#realestate', '#forsale', '#homebuying']
    : ['#realestate', '#forsale'];

  return { slides, caption, hashtags, source: 'fallback' };
};

// ── Validation ────────────────────────────────────────────────────────────────

const WORD_LIMITS: Record<SlideCopy['role'], number> = { hook: 8, meat: 10, cta: 7 };
const SMALL_INT_RE = /^[1-5]$/;
const SMALL_INT_SUFFIX_RE = /\b[1-5]\s+(things|reasons|ways|signs)\b/i;

const extractNumbers = (text: string): string[] =>
  (text.match(/\$?[\d,]+(?:\.\d+)?[Kk]?/g) ?? []).map((n) =>
    n.replace(/[$,]/g, '').replace(/[Kk]$/, '000'),
  );

const factsNumbers = (facts: ListingFacts, address: string): Set<string> => {
  const set = new Set<string>();
  if (facts.priceUsd !== null) set.add(String(Math.round(facts.priceUsd)));
  if (facts.beds !== null) set.add(String(facts.beds));
  if (facts.baths !== null) set.add(String(facts.baths));
  if (facts.sqft !== null) set.add(String(facts.sqft));
  if (facts.daysOnMarket !== null) set.add(String(facts.daysOnMarket));
  // Numbers from address string
  (address.match(/\d+/g) ?? []).forEach((n) => set.add(n));
  // Numbers from price history dates and prices
  facts.priceHistory?.forEach((e) => {
    set.add(String(e.price));
    (e.date.match(/\d+/g) ?? []).forEach((n) => set.add(n));
  });
  return set;
};

export const validateSlideshowCopy = (
  copy: Omit<SlideshowCopy, 'source'>,
  facts: ListingFacts,
): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { slides, caption, hashtags } = copy;

  // Slide count and order
  if (slides.length !== 5) errors.push(`Expected 5 slides, got ${slides.length}`);
  const expectedRoles: SlideCopy['role'][] = ['hook', 'meat', 'meat', 'meat', 'cta'];
  slides.forEach((s, i) => {
    if (s.role !== expectedRoles[i]) errors.push(`Slide ${i + 1}: expected role "${expectedRoles[i]}", got "${s.role}"`);
  });

  // Word limits
  slides.forEach((s, i) => {
    const words = s.text.trim().split(/\s+/).length;
    const limit = WORD_LIMITS[s.role];
    if (words > limit) errors.push(`Slide ${i + 1} (${s.role}): ${words} words exceeds limit of ${limit}`);
  });

  // No "!" on hook
  if (slides[0]?.text.includes('!')) errors.push('Hook must not contain "!"');

  // Fair Housing
  const allText = [...slides.map((s) => s.text), caption, ...hashtags].join(' ');
  if (hasFairHousingViolation(allText)) errors.push('Fair Housing violation detected');

  // Invented numbers
  const allowed = factsNumbers(facts, facts.address ?? '');
  const allNumbers = extractNumbers(allText);
  for (const n of allNumbers) {
    const parsed = parseFloat(n);
    if (Number.isNaN(parsed)) continue;
    // Allow small integers 1-5 followed by things|reasons|ways|signs
    if (SMALL_INT_RE.test(n) && SMALL_INT_SUFFIX_RE.test(allText)) continue;
    if (!allowed.has(n) && !allowed.has(String(Math.round(parsed)))) {
      errors.push(`Number "${n}" not found in listing facts`);
    }
  }

  return { ok: errors.length === 0, errors };
};

// ── generateSlideshowCopy ─────────────────────────────────────────────────────

const isSlideCopy = (v: unknown): v is SlideCopy =>
  typeof v === 'object' && v !== null
  && ['hook', 'meat', 'cta'].includes((v as SlideCopy).role)
  && typeof (v as SlideCopy).text === 'string'
  && typeof (v as SlideCopy).photo === 'string';

const tryOnce = async (
  msgs: { role: 'system' | 'user'; content: string }[],
  facts: ListingFacts,
): Promise<{ copy: Omit<SlideshowCopy, 'source'>; errors: string[] } | null> => {
  const { result } = await chatJsonWithMeta<{ slides?: unknown; caption?: unknown; hashtags?: unknown }>(
    msgs,
    { maxTokens: 800, temperature: 0.65, timeoutMs: 30_000 },
  );
  if (!result) return null;
  const slides = Array.isArray(result.slides) ? result.slides.filter(isSlideCopy) : [];
  const caption = typeof result.caption === 'string' ? result.caption.slice(0, 150) : '';
  const hashtags = Array.isArray(result.hashtags) ? result.hashtags.filter((h): h is string => typeof h === 'string') : [];
  const draft = { slides, caption, hashtags };
  const { ok, errors } = validateSlideshowCopy(draft, facts);
  return { copy: draft, errors: ok ? [] : errors };
};

export const generateSlideshowCopy = async (
  facts: ListingFacts,
  angle: ReAngle,
  photoTags: PhotoTag[],
): Promise<SlideshowCopy> => {
  const base = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: buildPrompt(facts, angle, photoTags) },
  ];

  const first = await tryOnce(base, facts);
  if (first && first.errors.length === 0) return { ...first.copy, source: 'llm' };

  const retryMsgs = first
    ? [...base, { role: 'user' as const, content: `Previous attempt had errors:\n${first.errors.join('\n')}\nFix them and return valid JSON.` }]
    : base;
  const second = await tryOnce(retryMsgs, facts);
  if (second && second.errors.length === 0) return { ...second.copy, source: 'llm' };

  return buildFallback(facts, angle);
};
