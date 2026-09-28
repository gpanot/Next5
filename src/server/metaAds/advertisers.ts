// server-only — never import from a 'use client' file.
// Step 2b: read each relevant advertiser's full ad history (running + stopped), and the brand's own, so the winner
// score can compare every ad with what that advertiser kept and what it killed.

import type { AdvertiserSummary, BrandProfile, CompetitorAd } from '../../types/admin/metaAds';
import { pageAds, searchPages, toCompetitorAd, type RawAd, type RawPage } from './adLibrary';
import type { CostMeter } from './cost';
import { scoreHistory } from './evidence';

export type History = { summary: AdvertiserSummary; creatives: CompetitorAd[] };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The brand's own Facebook page, matched by handle, never guessed: the page alias or Instagram handle must equal the
 * site's domain name ("joinfleek" for joinfleek.com). Several pages share a brand name, so the name alone is not enough.
 */
export const matchOwnPage = (pages: RawPage[], domain: string): RawPage | null => {
  const stem = slug(domain.split('.')[0] ?? '');
  if (!stem) return null;
  return pages.find((p) => p.page_id && [p.page_alias, p.ig_username].some((h) => h && slug(h) === stem)) ?? null;
};

export const findOwnPage = async (profile: BrandProfile, meter: CostMeter): Promise<RawPage | null> => {
  try {
    return matchOwnPage(await searchPages(profile.brandName, meter), profile.domain);
  } catch (err) {
    console.warn('[meta-ads] own page lookup failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

/** One advertiser's history, scored. Null when the call fails: the ads then keep keyword-only evidence. */
export const readHistory = async (pageId: string, pageName: string, own: boolean, meter: CostMeter): Promise<History | null> => {
  try {
    const nowS = Math.floor(Date.now() / 1000);
    const { byReach, recentOnly } = await pageAds(pageId, meter);
    const toAds = (raws: RawAd[]) => raws.map((raw) => toCompetitorAd({ ...raw, page_id: raw.page_id ?? pageId }, 'page', nowS)).filter((a): a is CompetitorAd => a !== null);
    const ads = toAds(byReach);
    const recent = toAds(recentOnly);
    if (ads.length + recent.length === 0) return null;
    const { creatives, killMedianDays, active, stopped } = scoreHistory(ads, recent);
    return {
      summary: { pageId, pageName: (ads[0] ?? recent[0]).pageName || pageName, active, stopped, killMedianDays, own },
      creatives: creatives.map((c) => (own ? { ...c, own: true } : c)),
    };
  } catch (err) {
    console.warn(`[meta-ads] history for page ${pageId} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
};

/** Advertisers worth a history read: most kept ads first, then longest-running. */
export const topAdvertisers = (kept: CompetitorAd[], max: number): { pageId: string; pageName: string }[] => {
  const byPage = new Map<string, { pageName: string; count: number; maxDays: number }>();
  for (const ad of kept) {
    if (!ad.pageId) continue;
    const row = byPage.get(ad.pageId) ?? { pageName: ad.pageName, count: 0, maxDays: 0 };
    byPage.set(ad.pageId, { pageName: row.pageName, count: row.count + 1, maxDays: Math.max(row.maxDays, ad.daysRunning) });
  }
  return [...byPage.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].maxDays - a[1].maxDays)
    .slice(0, max)
    .map(([pageId, row]) => ({ pageId, pageName: row.pageName }));
};
