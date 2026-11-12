// server-only — never import from a 'use client' file.
// Words for one playbook slideshow: one gpt-5.4-mini call, flat top-level keys (small models drop nested fields).
// Every text goes through the Fair Housing guard; one retry names the blocked phrases, then the slideshow fails.

import type { ListingSlideshowKind as SlideshowKind } from '../../lib/realtorPlaybooks';
import type { PlaybookSlide } from '../../types/business/campaigns';
import { chatJson } from '../ai/openai';
import { FAIR_HOUSING_RULES } from '../compliance/fairHousing';
import { fairHousingProblems } from '../compliance/fairHousingCheck';
import type { RealtorFacts } from '../realtorVideo/script';
import type { NearbyPlace } from './neighborhood';
import type { SlidePhoto } from './photos';

export type SlideText = Omit<PlaybookSlide, 'key'>;
export type SlideshowCopy = { slides: SlideText[]; caption: string };

export type CopyInput = {
  kind: SlideshowKind;
  facts: RealtorFacts;
  street: string;
  photos: SlidePhoto[];
  places: NearbyPlace[];
  /** Moment facts the writer must use as given: open house date and hours, new and old price. */
  moment?: string;
  /** The caption's keyword CTA line (§6). */
  ctaLine: string;
};

const TITLE_MAX = 48;
const BODY_MAX = 90;

const KIND_BRIEF: Record<SlideshowKind, string> = {
  coming_soon: 'A teaser before the listing goes live. Hook: "Coming soon in {city}" style, curious. Item slides: one short teaser per room photo, no price. CTA: ask people to guess the price in the comments.',
  room_by_room: 'A tour, one room per slide in the photo order. Item title = the room (e.g. "The kitchen"), body = one real feature from the description for that room. CTA: "Comment TOUR and I\'ll send you the details".',
  neighborhood: 'What is about 5 minutes from this home. Item slides: one place each from PLACES, in order: title = place name, body = "{minutes} min {walk|drive} · {type}". If PLACES is empty, use item slides for the home\'s best features instead. CTA: "Comment TOUR and I\'ll send you the details".',
  buyers_miss: '"3 things buyers miss on a tour", taught with this home: each item slide is one practical check (title = the check, body = why it matters), matched to the room in its photo. CTA: "Save this for your next tour" + "Comment TOUR to see this one".',
  status: 'Last call: this home is still available. Item slides: the key facts (price, beds/baths, sqft) and one standout feature. CTA: "Comment TOUR and I\'ll send you the details".',
  open_house_tips: '"5 things to check at an open house", taught with this home: each item slide is one practical check (title = the check, body = what to look for), matched to the room in its photo. Hook names the open house day from MOMENT. CTA: the open house date and hours from MOMENT + "Comment RSVP".',
  open_house_today: 'Open house TODAY. Hook: "Open house today" + the hours from MOMENT. Item slides: key facts (price, beds/baths, sqft) and one standout feature per room photo. CTA: the street + hours from MOMENT + "Comment TOUR for a private showing".',
  price_drop: 'New price. Hook: "New price" + the new price from MOMENT. First item slide: "Was {old price}" → "Now {new price}" exactly as in MOMENT. Other item slides: one real feature per room photo. CTA: "Comment TOUR and I\'ll send you the details".',
  sold: 'This home just sold. Hook: "Sold" + the street. Item slide: days on market only if MOMENT gives it, else one standout feature. No sale price unless MOMENT gives it. CTA: "Thinking of selling? DM VALUE for a free home value".',
};

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

const prompt = (input: CopyInput): string => {
  const { facts, photos, places } = input;
  const items = photos.length - 2;
  const keys = [...Array.from({ length: items }, (_, i) => `"s${i + 1}Title":"","s${i + 1}Body":""`)].join(',');
  return [
    `Home: ${input.street}, ${facts.city}, ${facts.state}. ${usd(facts.priceUsd)}, ${facts.beds} beds, ${facts.baths} baths, ${facts.sqft} sqft. Status: ${facts.status ?? 'for sale'}.`,
    `Description: ${facts.description.slice(0, 1500) || '(none)'}`,
    `Photos in slide order: ${photos.map((p, i) => `${i + 1}=${p.tag}`).join(', ')}.`,
    `PLACES: ${places.length ? places.map((p) => `${p.name} (${p.type}, ${p.minutes} min ${p.mode})`).join('; ') : '(none)'}`,
    `MOMENT: ${input.moment || '(none)'}`,
    `Slideshow: ${KIND_BRIEF[input.kind]}`,
    `Write ${photos.length} slides: 1 hook, ${items} item slides, 1 CTA. Titles max 6 words, bodies max 12 words. 3rd-grade English, no emoji, no hashtags on slides, no claim you cannot see in the facts.`,
    `Caption: 2 short lines about the home + this exact CTA line: "${input.ctaLine}" + 4 hashtags (city, real estate).`,
    FAIR_HOUSING_RULES,
    `Return JSON only: {"hookTitle":"","hookBody":"",${keys},"ctaTitle":"","ctaBody":"","caption":""}`,
  ].join('\n');
};

const clip = (value: unknown, max: number): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const toCopy = (raw: Record<string, unknown>, photos: number): SlideshowCopy | null => {
  const items = Array.from({ length: photos - 2 }, (_, i): SlideText => ({ role: 'item', title: clip(raw[`s${i + 1}Title`], TITLE_MAX), body: clip(raw[`s${i + 1}Body`], BODY_MAX) }));
  const slides: SlideText[] = [
    { role: 'hook', title: clip(raw.hookTitle, TITLE_MAX + 20), body: clip(raw.hookBody, BODY_MAX) },
    ...items,
    { role: 'cta', title: clip(raw.ctaTitle, TITLE_MAX), body: clip(raw.ctaBody, BODY_MAX) },
  ];
  if (slides.some((s) => !s.title)) return null;
  return { slides, caption: String(raw.caption ?? '').trim().slice(0, 2_000) };
};

const hitsOf = (copy: SlideshowCopy): Promise<string[]> => fairHousingProblems([...copy.slides.flatMap((s) => [s.title, s.body]), copy.caption]);

/** The slideshow's words, Fair Housing clean. Throws when the model fails twice. */
export const writeSlideshow = async (input: CopyInput): Promise<SlideshowCopy> => {
  let extra = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chatJson<Record<string, unknown>>(
      [
        { role: 'system', content: 'You write short TikTok/Instagram photo slideshows for a US real estate agent.' },
        { role: 'user', content: prompt(input) + extra },
      ],
      { maxTokens: 2500, temperature: 0.7, model: 'gpt-5.4-mini', reasoningEffort: 'low', timeoutMs: 60_000 },
    );
    const copy = raw ? toCopy(raw, input.photos.length) : null;
    if (!copy) continue;
    const hits = await hitsOf(copy);
    if (hits.length === 0) return copy;
    extra = `\nYour last draft used blocked phrases: ${hits.join(', ')}. Rewrite without them.`;
  }
  throw new Error('Could not write this slideshow within Fair Housing rules.');
};
