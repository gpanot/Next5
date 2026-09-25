// server-only — never import from a 'use client' file.
//
// Zillow deck generator: given a listing + angle, produces 6 cards (one per hook archetype)
// that share one story (meat + CTA) — a Hormozi hook test — ready for the SwipeDeck.
//
//   1. writeMeat         1 LLM call (+ retries): levers, 5 story lines, CTA, all guardrail-checked
//   2. generateHooks     1 LLM call: 18 hooks → 6 (one per archetype)
//   3. directBriefMedia  semantic search over the described asset library + listing photos
//   4. music             described, rights-safe tracks rotated across cards
//   5. persist           one slideshow_variants row per card (swipes are logged against it)

import type { ListingFacts, ReAngle } from './slideshowCopy';
import { generateHooks } from '../slideshow/core/hooks';
import type { HookGenerationInput } from '../slideshow/core/hooks';
import { contentWords } from '../slideshow/core/copyGuards';
import { buildBriefCards, persistCards, type DeckItem, type StoryTexts } from '../slideshow/core/deckAssembly';
import { searchMusic, type LibraryTrack } from '../slideshow/core/library';
import { zillowEngine } from '../slideshow/engines/zillow/engine';
import type { ZillowBrief } from '../slideshow/engines/zillow/engine';
import { angleFact, usd } from '../slideshow/engines/zillow/guardrails';
import { ANGLE_ENERGY, directBriefMedia } from '../slideshow/engines/zillow/media';

export type { DeckItem };

const ANGLE_LABELS: Record<ReAngle, string> = {
  just_listed: 'Just Listed', price_reduction: 'Price Reduction', open_house: 'Open House',
  feature_highlight: 'Feature Highlight', sold: 'Sold', neighborhood: 'Neighborhood',
};

const ANGLE_AUDIENCE: Record<ReAngle, 'Buyers' | 'Sellers'> = {
  just_listed: 'Buyers', price_reduction: 'Buyers', open_house: 'Buyers',
  feature_highlight: 'Buyers', sold: 'Sellers', neighborhood: 'Buyers',
};

const ANGLE_HUES: Record<ReAngle, number> = {
  price_reduction: 18, open_house: 250, just_listed: 142, sold: 340, feature_highlight: 200, neighborhood: 60,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toBriefFacts(facts: ListingFacts): ZillowBrief['facts'] {
  return {
    address:      facts.address,
    city:         facts.city,
    state:        facts.state,
    priceUsd:     facts.priceUsd,
    beds:         facts.beds,
    baths:        facts.baths,
    sqft:         facts.sqft,
    status:       facts.status,
    daysOnMarket: facts.daysOnMarket,
    // The scrape only says an open house exists — no date. The prompt forbids stating one.
    isOpenHouse:  facts.isOpenHouse,
    priceHistory: facts.priceHistory ?? undefined,
    description:  facts.description,
  };
}

/** Beds, baths, sqft and price exactly as listed. */
function factsLine(facts: ListingFacts): string | null {
  return [
    facts.beds  != null ? `${facts.beds} beds` : null,
    facts.baths != null ? `${facts.baths} baths` : null,
    facts.sqft  ? `${facts.sqft.toLocaleString('en-US')} sqft` : null,
    facts.priceUsd ? usd(facts.priceUsd) : null,
  ].filter(Boolean).join(', ') || null;
}

function hookInputFor(brief: ZillowBrief, facts: ListingFacts, story: StoryTexts, levers: HookGenerationInput['levers']): HookGenerationInput {
  const baseRules = zillowEngine.hookRules(brief);
  const place = facts.city ? ` in ${facts.city}` : '';
  return {
    briefId:      brief.id,
    audience:     brief.audience === 'buyers' ? `Home buyers${place}` : `Homeowners${place} thinking of selling`,
    pain:         story.pain,
    dreamOutcome: levers.dreamOutcome,
    proofLine:    factsLine(facts),
    lensLine:     `${brief.angle}. ${angleFact(brief.facts, brief.angle)}`,
    // The named feature also counts as a specific: "Wait until you see the pool".
    rules:        { ...baseRules, specifics: [...(baseRules.specifics ?? []), ...contentWords(levers.namedMechanism)] },
    levers,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export type GenerateDeckInput = {
  facts: ListingFacts;
  angle: ReAngle;
  photoTags: string[];
  selectedCandidates: Array<{ id: string; url: string }>;
  listingRunId?: string | null;
};

/**
 * Generate up to 6 deck cards for one Zillow listing + angle.
 * Each card has a different hook (text + media); story lines, story media and CTA are shared.
 */
export async function generateZillowDeck(input: GenerateDeckInput): Promise<DeckItem[]> {
  const { facts, angle, photoTags, selectedCandidates } = input;
  if (angle === 'neighborhood') throw new Error('neighborhood angle is not supported in v1');

  const brief: ZillowBrief = {
    id:       `deck-${angle}`,
    angle,
    audience: ANGLE_AUDIENCE[angle] === 'Buyers' ? 'buyers' : 'sellers',
    facts:    toBriefFacts(facts),
    photoTags,
  };

  const { levers, meat, cta } = await zillowEngine.writeMeat(brief);
  const story: StoryTexts = { ...meat, cta };
  console.log(`[ZillowDeck] story: ${Object.values(story).join(' | ')}`);

  const [{ kept: hooks }, tracks] = await Promise.all([
    generateHooks(hookInputFor(brief, facts, story, levers)),
    searchMusic(ANGLE_ENERGY[angle]).catch((err): LibraryTrack[] => {
      console.error('[ZillowDeck] music search failed:', err);
      return [];
    }),
  ]);
  if (hooks.length === 0) return [];

  const media = await directBriefMedia({
    angle,
    meat: story,
    namedMechanism: levers.namedMechanism,
    hooks,
    photos: selectedCandidates.map((c, i) => ({ id: c.id, url: c.url, tag: photoTags[i] ?? (i === 0 ? 'exterior' : 'other') })),
  });

  const line = factsLine(facts);
  const cards = buildBriefCards({
    engine: 'zillow',
    lensId: angle,
    lensLabel: ANGLE_LABELS[angle],
    audienceLabel: ANGLE_AUDIENCE[angle],
    hue: ANGLE_HUES[angle],
    story,
    storyMedia: media.meat,
    hooks,
    hookMedia: media.hooks,
    tracks,
    proofNote: line ? `Every number from the listing: ${line}.` : 'Numbers come from the listing only.',
  });
  return persistCards(cards, { listingRunId: input.listingRunId });
}
