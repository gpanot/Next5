// server-only — never import from a 'use client' file.
// Words for one tip carousel (Evergreen, "Thinking of selling?", spotlight): one gpt-5.4-mini call, flat top-level
// keys (small models drop nested fields), Fair Housing guard (blocklist + nano), one retry naming the blocked phrases.

import { chatJson } from '../ai/openai';
import { FAIR_HOUSING_RULES } from '../compliance/fairHousing';
import { fairHousingProblems } from '../compliance/fairHousingCheck';
import type { NearbyPlace } from './neighborhood';

export type TipText = { title: string; body: string };
export type TipCopy = { kicker: string; hook: TipText; items: TipText[]; cta: TipText; caption: string };

export type TipInput = {
  /** What the carousel teaches (Beat.brief), or the spotlight brief. */
  brief: string;
  /** "Austin, TX" or "" when we do not know her area. */
  area: string;
  /** Spotlight only: the sourced places, one per item slide, in order. */
  places: NearbyPlace[];
  /** The caption's keyword CTA line (§6). */
  ctaLine: string;
  /** Face mode: she is on the hook and CTA slides, so the hook may speak as "I". */
  face: boolean;
};

const MIN_ITEMS = 3;
const MAX_ITEMS = 5;
const clip = (value: unknown, max: number): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const spotlightBrief = (places: NearbyPlace[]) =>
  `Local spotlight: one place per item slide, in this order: ${places.map((p) => `${p.name} (${p.type})`).join('; ')}. Item title = the place name exactly, body = one plain line on what it is (no ratings, no claims you cannot check).`;

const prompt = (input: TipInput, count: number): string => {
  const keys = Array.from({ length: count }, (_, i) => `"i${i + 1}Title":"","i${i + 1}Body":""`).join(',');
  return [
    `You write a short TikTok/Instagram tip carousel for a US real estate agent${input.area ? ` in ${input.area}` : ''}.`,
    `Topic: ${input.places.length ? spotlightBrief(input.places) : input.brief}`,
    input.face ? 'The agent is shown on the first and last slide: the hook may speak as "I".' : 'No person is shown: write it as plain, useful tips.',
    `Write: kicker (2-3 words, e.g. "Buyer tip"), hook title (max 7 words) + hook body (max 12 words), ${count} items (title max 6 words, body max 16 words), CTA title (max 7 words) + CTA body (max 14 words).`,
    'Rules: 3rd-grade English, no emoji, no hashtags on slides, no numbers or laws you are not sure are true everywhere in the US, no invented clients, addresses or prices.',
    `Caption: 2 short lines + this exact CTA line: "${input.ctaLine}" + 4 hashtags${input.area ? ' (the city + real estate)' : ' (real estate)'}.`,
    FAIR_HOUSING_RULES,
    `Return JSON only: {"kicker":"","hookTitle":"","hookBody":"",${keys},"ctaTitle":"","ctaBody":"","caption":""}`,
  ].join('\n');
};

const toCopy = (raw: Record<string, unknown>, count: number): TipCopy | null => {
  const items = Array.from({ length: count }, (_, i) => ({ title: clip(raw[`i${i + 1}Title`], 60), body: clip(raw[`i${i + 1}Body`], 120) })).filter((t) => t.title);
  const hook = { title: clip(raw.hookTitle, 70), body: clip(raw.hookBody, 100) };
  const cta = { title: clip(raw.ctaTitle, 70), body: clip(raw.ctaBody, 110) };
  if (!hook.title || !cta.title || items.length < MIN_ITEMS) return null;
  return { kicker: clip(raw.kicker, 24) || 'Real estate tip', hook, items, cta, caption: String(raw.caption ?? '').trim().slice(0, 2_000) };
};

const textsOf = (c: TipCopy) => [c.kicker, c.hook.title, c.hook.body, ...c.items.flatMap((i) => [i.title, i.body]), c.cta.title, c.cta.body, c.caption];

/** The carousel's words, Fair Housing clean. Throws when the model fails twice. */
export const writeTips = async (input: TipInput): Promise<TipCopy> => {
  const count = input.places.length ? Math.min(MAX_ITEMS, Math.max(MIN_ITEMS, input.places.length)) : 4;
  let extra = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chatJson<Record<string, unknown>>(
      [
        { role: 'system', content: 'You write short, useful real estate tip carousels. JSON only.' },
        { role: 'user', content: prompt(input, count) + extra },
      ],
      { maxTokens: 2500, model: 'gpt-5.4-mini', reasoningEffort: 'low', timeoutMs: 60_000 },
    );
    const copy = raw ? toCopy(raw, count) : null;
    if (!copy) continue;
    const problems = await fairHousingProblems(textsOf(copy));
    if (problems.length === 0) return copy;
    extra = `\nYour last draft used blocked phrases: ${problems.join(', ')}. Rewrite without them.`;
  }
  throw new Error('Could not write this carousel within Fair Housing rules.');
};
