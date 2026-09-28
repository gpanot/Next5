// server-only — never import from a 'use client' file.
// Step 2: find the category's live ads (keyword search), keep the relevant ones, then read the full history of the
// top advertisers and of the brand itself, so every ad carries winner evidence from its advertiser's own behaviour.

import type { BrandProfile, CompetitorAd, CompetitorResearch } from '../../types/admin/metaAds';
import { searchKeyword, toCompetitorAd, type RawAd } from './adLibrary';
import { findOwnPage, readHistory, topAdvertisers, type History } from './advertisers';
import { filterCompetitors } from './competitorFilter';
import type { CostMeter } from './cost';
import { groupCreatives, winnerEvidence } from './evidence';

const MAX_ADS = 25;
/** Candidates sent to the relevance filter. */
const MAX_CANDIDATES = 60;
/** Advertisers whose full history is read (~$0.002 each). */
const MAX_ADVERTISERS = 6;
/** So one big advertiser cannot fill the whole study. */
const MAX_PER_ADVERTISER = 5;
/** Below this many candidates, the search also runs broader 2-word versions of the keywords. */
const MIN_CANDIDATES = 25;

const buildStats = (ads: CompetitorAd[]): CompetitorResearch['stats'] => {
  const formats: Record<string, number> = {};
  const ctas: Record<string, number> = {};
  for (const ad of ads) {
    formats[ad.format] = (formats[ad.format] ?? 0) + 1;
    if (ad.cta) ctas[ad.cta] = (ctas[ad.cta] ?? 0) + 1;
  }
  const total = ads.reduce((sum, ad) => sum + ad.body.length, 0);
  return {
    avgPrimaryTextChars: ads.length ? Math.round(total / ads.length) : 0,
    formats,
    topCtas: Object.entries(ctas).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cta]) => cta),
    maxDaysRunning: ads.reduce((max, ad) => Math.max(max, ad.daysRunning), 0),
  };
};

/** "vintage wholesale marketplace resellers" → "vintage wholesale": Ad Library matches every word, so fewer words = more ads. */
const broaden = (keywords: string[]): string[] => {
  const short = keywords.map((k) => k.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
  return [...new Set(short)].filter((k) => k.includes(' ') && !keywords.some((orig) => orig.toLowerCase() === k));
};

const collect = async (keywords: string[], skip: (ad: CompetitorAd) => boolean, into: Map<string, CompetitorAd>, meter: CostMeter) => {
  const nowS = Math.floor(Date.now() / 1000);
  const pages = await Promise.all(
    keywords.map(async (k) => ({
      k,
      ads: await searchKeyword(k, meter).catch((err: unknown) => {
        console.warn(`[meta-ads] search "${k}" failed:`, err instanceof Error ? err.message : err);
        return [] as RawAd[];
      }),
    })),
  );
  for (const { k, ads: raws } of pages) {
    for (const raw of raws) {
      const ad = toCompetitorAd(raw, k, nowS);
      if (!ad || skip(ad)) continue;
      const dedupe = `${ad.pageId || ad.pageName}|${ad.body.slice(0, 80)}`;
      if (!into.has(dedupe)) into.set(dedupe, ad);
    }
  }
};

/** Ads from advertisers without a readable history get evidence from the ad alone (no kill window, no reach rank). */
const keywordOnlyEvidence = (ads: CompetitorAd[]): CompetitorAd[] =>
  groupCreatives(ads).map((c) => ({ ...c.rep, evidence: winnerEvidence(c, null, null) }));

/** Running creatives only, best evidence first, at most MAX_PER_ADVERTISER per advertiser. */
const selectPool = (histories: History[], orphans: CompetitorAd[]): CompetitorAd[] => {
  const pool = [...histories.filter((h) => !h.summary.own).flatMap((h) => h.creatives), ...keywordOnlyEvidence(orphans)].filter((a) => a.isActive);
  const perPage = new Map<string, number>();
  return pool
    .sort((a, b) => (b.evidence?.winnerScore ?? 0) - (a.evidence?.winnerScore ?? 0))
    .filter((ad) => {
      const n = perPage.get(ad.pageId || ad.pageName) ?? 0;
      perPage.set(ad.pageId || ad.pageName, n + 1);
      return n < MAX_PER_ADVERTISER;
    })
    .slice(0, MAX_CANDIDATES);
};

export const researchCompetitors = async (profile: BrandProfile, meter: CostMeter): Promise<CompetitorResearch> => {
  const ownPagePromise = findOwnPage(profile, meter);
  const brand = profile.brandName.toLowerCase();
  const found = new Map<string, CompetitorAd>();
  const keywords = [...profile.searchKeywords];
  const skipOwn = (ad: CompetitorAd) => ad.pageName.toLowerCase() === brand;
  await collect(keywords, skipOwn, found, meter);
  if (found.size < MIN_CANDIDATES) {
    const broader = broaden(keywords);
    await collect(broader, skipOwn, found, meter);
    keywords.push(...broader);
  }
  if (found.size === 0) throw new Error(`No live Meta ads found for: ${keywords.join(', ')}`);

  const ownPage = await ownPagePromise;
  const candidates = [...found.values()].filter((a) => a.pageId !== ownPage?.page_id).sort((a, b) => b.daysRunning - a.daysRunning).slice(0, MAX_CANDIDATES);
  // First pass: which advertisers sell what the brand sells.
  const { ads: kept } = await filterCompetitors(profile, candidates, meter);
  if (kept.length === 0) throw new Error(`None of ${candidates.length} ads for "${keywords.join('", "')}" matched the brand's category`);

  const advertisers = topAdvertisers(kept, MAX_ADVERTISERS);
  const reads = await Promise.all([
    ...advertisers.map((a) => readHistory(a.pageId, a.pageName, false, meter)),
    ownPage?.page_id ? readHistory(ownPage.page_id, ownPage.name ?? profile.brandName, true, meter) : Promise.resolve(null),
  ]);
  const histories = reads.filter((h): h is History => h !== null);
  const readPages = new Set(histories.map((h) => h.summary.pageId));
  // Second pass: an advertiser's history can hold off-category ads (other product lines), so the final study is
  // filtered again, and its patterns come from the ads actually studied.
  const pool = selectPool(histories, kept.filter((a) => !readPages.has(a.pageId)));
  const { ads: relevant, patterns } = await filterCompetitors(profile, pool, meter);
  const ads = (relevant.length ? relevant : pool).slice(0, MAX_ADS);
  const own = histories.find((h) => h.summary.own);

  return {
    keywords,
    ads,
    patterns,
    candidateCount: candidates.length,
    brandCount: new Set(ads.map((a) => a.pageName)).size,
    stats: buildStats(ads),
    advertisers: histories.map((h) => h.summary),
    ownAds: (own?.creatives ?? []).sort((a, b) => (b.evidence?.winnerScore ?? 0) - (a.evidence?.winnerScore ?? 0)),
    ownPageId: ownPage?.page_id ?? null,
  };
};
