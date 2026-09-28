// server-only — never import from a 'use client' file.
// Step 2b: keyword search returns noise (personal Marketplace posts, unrelated shops). One LLM pass keeps only
// ads that sell a similar offer to a similar buyer, and names the patterns those ads share — from the ads alone.

import type { BrandProfile, CompetitorAd } from '../../types/admin/metaAds';
import type { CostMeter } from './cost';
import { metaAdsJson } from './llm';
import { clip } from './text';

const SYSTEM = `You screen Meta Ad Library results for a competitor study.
Keep an ad only if it is a business selling a similar offer to a similar buyer as the brand. Drop personal sellers,
"we buy your stuff" posts, unrelated products and generic catalog ads.
Then, from the KEPT ads only, name 3 patterns they share (hook, offer, proof, format). Each pattern one short line,
and it must be true of the ads you kept — never borrow from the brand description.
Return JSON: {"keep": number[] (ad numbers), "patterns": string[3]}`;

const listAds = (ads: CompetitorAd[]) =>
  ads.map((ad, i) => `${i + 1}. [${ad.pageName}, ${ad.format}, live ${ad.daysRunning}d] ${ad.title ? `"${ad.title}" — ` : ''}${clip(ad.body, 240)}`).join('\n');

export const filterCompetitors = async (profile: BrandProfile, ads: CompetitorAd[], meter: CostMeter): Promise<{ ads: CompetitorAd[]; patterns: string[] }> => {
  const raw = await metaAdsJson<{ keep?: unknown; patterns?: unknown }>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `BRAND: ${profile.brandName} — ${profile.valueProp}\nBUYER: ${profile.audience}\n\nADS\n${listAds(ads)}` },
    ],
    { maxTokens: 4_000, meter, label: 'OpenAI relevance filter' },
  );
  const keep = new Set(Array.isArray(raw.keep) ? raw.keep.filter((n): n is number => typeof n === 'number') : []);
  const kept = ads.filter((_, i) => keep.has(i + 1));
  const patterns = Array.isArray(raw.patterns) ? raw.patterns.filter((p): p is string => typeof p === 'string').slice(0, 3) : [];
  return { ads: kept, patterns: kept.length ? patterns : [] };
};
