// server-only — website engine guardrails (spec 5.6).
// Proof must be real, numbers must come from the site, no unprovable claims, no competitor names.

import { extractNumbers, findSlopPhrase } from '../../core/copyGuards';
import { checkMeatDraft, checkShotTexts, type LineGuard } from '../../core/meatCheck';
import type { MeatLines, ProofPoint } from '../../core/types';

/** What the guard needs from the profile. */
export type WebsiteFacts = {
  /** Profile text the business wrote about itself: promoting, offer, positioning, tagline, description. */
  siteText: string[];
  proofPoints: ProofPoint[];
  competitors: string[];
};

/** Numbers the copy may use: the ones printed on the site (proof quotes and the business's own lines). */
export function allowedNumbers(facts: WebsiteFacts): Set<string> {
  const set = new Set<string>();
  [...facts.siteText, ...facts.proofPoints.map((p) => p.evidence)].forEach((t) => extractNumbers(t).forEach((n) => set.add(n)));
  return set;
}

/**
 * Claims a small business cannot back up in a 4-second shot (and platforms flag in ads).
 * "Guaranteed", "#1", "best", "leading"… are allowed only when the site itself says them in a proof quote.
 */
const UNPROVABLE =
  /\b(guarantee\w*|risk[- ]free|the best|best in|#\s?1|number one|leading|top[- ]rated|world[- ]class|award[- ]winning|proven|instantly|overnight|forever)\b/i;

/** Returns why a line breaks a guardrail, or null when it is clean. */
export function guardLine(text: string, facts: WebsiteFacts, allowed: Set<string>): string | null {
  const invented = extractNumbers(text).find((n) => !allowed.has(n) && !allowed.has(String(parseFloat(n))));
  if (invented) return `number "${invented}" is not on the website`;
  const claim = text.match(UNPROVABLE)?.[0];
  const quoted = claim && facts.proofPoints.some((p) => p.evidence.toLowerCase().includes(claim.toLowerCase()));
  if (claim && !quoted) return `"${claim}" is a claim the site does not prove`;
  const rival = facts.competitors.find((c) => c.length > 2 && text.toLowerCase().includes(c.toLowerCase()));
  if (rival) return `names a competitor ("${rival}")`;
  const slop = findSlopPhrase(text);
  if (slop) return `filler phrase "${slop}"`;
  return null;
}

export const lineGuard = (facts: WebsiteFacts): LineGuard => {
  const allowed = allowedNumbers(facts);
  return (t) => guardLine(t, facts, allowed);
};

/** All problems with a meat + CTA draft (retry prompt). */
export const validateMeat = (meat: Omit<MeatLines, 'cta'>, cta: string, facts: WebsiteFacts): string[] =>
  checkMeatDraft(meat, cta, lineGuard(facts));

/** Re-checks an edited card before render. Empty = ok. */
export const checkEditedShots = (texts: string[], facts: WebsiteFacts): string[] =>
  checkShotTexts(texts, lineGuard(facts));
