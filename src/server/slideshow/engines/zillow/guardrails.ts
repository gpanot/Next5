// server-only — zillow engine guardrails (spec 6.4).
// Every number traces to ListingFacts, Fair Housing, no market claims, no filler.

import { hasFairHousingViolation } from '../../../labs/fairHousing';
import { extractNumbers, findSlopPhrase } from '../../core/copyGuards';
import { checkMeatDraft, checkShotTexts } from '../../core/meatCheck';
import type { ListingAngle, MeatLines } from '../../core/types';

export type ZillowFacts = {
  address: string | null;
  city: string | null;
  state: string | null;
  priceUsd: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: string;
  daysOnMarket: number | null;
  /** True when the listing has an open house. The scrape carries no date. */
  isOpenHouse: boolean;
  priceHistory?: Array<{ date: string; event: string; price: number; priceChangeRate: number }>;
  description: string | null;
};

// ── Formatting ────────────────────────────────────────────────────────────────

export const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

// ── Price drop from history ───────────────────────────────────────────────────

export type PriceDrop = { from: number; to: number };

/**
 * Most recent price cut, read from real history rows (newest first, as Zillow returns it).
 * The old price is the next older row with a price — never computed from the rate.
 */
export function latestPriceDrop(facts: ZillowFacts): PriceDrop | null {
  const history = facts.priceHistory ?? [];
  const cutIdx = history.findIndex((e) => e.event === 'Price change' && e.priceChangeRate < 0);
  if (cutIdx < 0) return null;
  const to = history[cutIdx]!.price;
  const older = history.slice(cutIdx + 1).find((e) => e.price > 0);
  return older && older.price > to ? { from: older.price, to } : null;
}

// ── Angle urgency fact (Shot 6 source) ───────────────────────────────────────

/** The one urgency fact the angle allows, stated so the LLM cannot stretch it. */
export function angleFact(facts: ZillowFacts, angle: ListingAngle): string {
  switch (angle) {
    case 'price_reduction': {
      const drop = latestPriceDrop(facts);
      return drop
        ? `Price cut from ${usd(drop.from)} to ${usd(drop.to)} (${usd(drop.from - drop.to)} off).`
        : 'The price was just cut. The old price is unknown: do not state it.';
    }
    case 'open_house':
      return 'An open house is scheduled. The date and time are NOT known: never state a day, date or time.';
    case 'just_listed':
      return facts.daysOnMarket != null ? `On the market ${facts.daysOnMarket} days.` : 'Newly listed.';
    case 'sold':
      return facts.daysOnMarket != null ? `Sold after ${facts.daysOnMarket} days on the market.` : 'Sold.';
    case 'feature_highlight':
      return 'No deadline. Urgency comes only from the feature itself, never from a made-up deadline.';
  }
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/** Every number a line may use: facts, history prices, the price cut, address and description digits. */
export function allowedNumbers(facts: ZillowFacts): Set<string> {
  const set = new Set<string>();
  const add = (n: number | null | undefined) => { if (n != null) set.add(String(Math.round(n * 10) / 10)); };
  [facts.priceUsd, facts.beds, facts.baths, facts.sqft, facts.daysOnMarket].forEach(add);
  facts.priceHistory?.forEach((e) => add(e.price));
  const drop = latestPriceDrop(facts);
  if (drop) add(drop.from - drop.to);
  [facts.address ?? '', facts.description ?? ''].forEach((t) => extractNumbers(t).forEach((n) => set.add(n)));
  return set;
}

// ── One-line guard (used for hooks and every shot) ───────────────────────────

/** The scrape has no showing schedule, so any day or time in copy is invented. */
const INVENTED_TIME =
  /\b(this (week|weekend)|next week|tomorrow|tonight|(mon|tues|wednes|thurs|fri|satur|sun)days?)\b/i;

const MARKET_CLAIM =
  /\b(rare|hot market|market is|prices (are|keep|going|rising|climbing)|inventory|demand|bidding war|selling fast|going fast|won'?t last|spring market|rates are|home value|resale|appreciat\w*|investment|equity|competitors?|other buyers|everyone is)\b/i;

/** Returns why a line breaks a guardrail, or null when it is clean. */
export function guardLine(text: string, allowed: Set<string>): string | null {
  const invented = extractNumbers(text).find((n) => !allowed.has(n) && !allowed.has(String(parseFloat(n))));
  if (invented) return `number "${invented}" is not in the listing`;
  if (hasFairHousingViolation(text)) return 'Fair Housing: describes people, not the property';
  if (MARKET_CLAIM.test(text)) return 'market claim';
  if (INVENTED_TIME.test(text)) return 'states a day or time the listing does not give';
  const slop = findSlopPhrase(text);
  if (slop) return `filler phrase "${slop}"`;
  return null;
}

// ── Meat + edited-card checks (shared logic in core/meatCheck.ts) ───────────

/** All problems with a meat + CTA draft, phrased as fix instructions for the retry prompt. */
export function validateMeat(meat: Omit<MeatLines, 'cta'>, cta: string, facts: ZillowFacts): string[] {
  const allowed = allowedNumbers(facts);
  return checkMeatDraft(meat, cta, (t) => guardLine(t, allowed));
}

/** Re-checks a card after the user edited it (format + every guardrail). Empty = ok to render. */
export function checkEditedShots(texts: string[], facts: ZillowFacts): string[] {
  const allowed = allowedNumbers(facts);
  return checkShotTexts(texts, (t) => guardLine(t, allowed));
}
