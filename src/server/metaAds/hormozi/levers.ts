// server-only — never import from a 'use client' file.
// Step 3b: the claims the brand can make on each value-equation lever, each backed by a sentence from its own site.
// A lever whose quote is not on the page is dropped, so the copy step can only promise what the brand says.

import { HORMOZI_CRITERIA, type BrandLever, type BrandProfile, type HormoziCriterion } from '../../../types/admin/metaAds';
import type { CostMeter } from '../cost';
import { metaAdsJson } from '../llm';
import { isVerbatim } from './verify';

const LEVER_CRITERIA: HormoziCriterion[] = ['dreamOutcome', 'likelihood', 'timeDelay', 'effort', 'proof', 'offer'];

const SYSTEM = `From a brand's website text, list the claims it can make in an ad, sorted by Alex Hormozi's value equation:
dreamOutcome (the result the buyer gets), likelihood (why it will work: protection, verification, guarantees),
timeDelay (speed), effort (work removed), proof (numbers, results, customers), offer (price, discount, bonus, guarantee).
Rules:
- Each claim: plain words, max 12 words.
- Each claim needs "quote": the exact sentence fragment from the website text that supports it (copy-paste, 4-25 words).
- Only what the text says. If a lever has no support in the text, leave it out.
- Up to 3 claims per lever.
Return JSON: {"levers": [{"criterion": one of ${LEVER_CRITERIA.join(', ')}, "claim": string, "quote": string}]}`;

export const extractLevers = async (profile: BrandProfile, meter: CostMeter): Promise<BrandLever[]> => {
  const raw = await metaAdsJson<{ levers?: { criterion?: string; claim?: unknown; quote?: unknown }[] }>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `BRAND: ${profile.brandName}\n\nWEBSITE TEXT\n${profile.pageExcerpt}` },
    ],
    { maxTokens: 6_000, meter, label: 'OpenAI brand levers' },
  );
  const seen = new Set<string>();
  const levers: BrandLever[] = [];
  for (const lever of raw.levers ?? []) {
    const criterion = lever.criterion as HormoziCriterion;
    if (!(HORMOZI_CRITERIA as readonly string[]).includes(criterion) || typeof lever.claim !== 'string' || !lever.claim.trim()) continue;
    if (!isVerbatim(lever.quote, profile.pageExcerpt)) continue;
    const key = lever.claim.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    levers.push({ id: `L${levers.length + 1}`, criterion, claim: lever.claim.trim(), quote: lever.quote.trim() });
  }
  if (levers.length === 0) throw new Error('No brand claim could be matched to a sentence on the site');
  return levers;
};
