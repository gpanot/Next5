// server-only — never import from a 'use client' file.
// Meta Ad Library via treg (ScrapeCreators, ~$0.002 per call): keyword search, advertiser pages, page lookup.

import type { CompetitorAd } from '../../types/admin/metaAds';
import { tregCall } from '../admin/ugcLab';
import { AD_LIBRARY_PAGE_MICROS, type CostMeter } from './cost';

const SEARCH_ADS = 'scrapecreators.x.v1-facebook-adlibrary-search-ads';
const PAGE_ADS = 'scrapecreators.x.v1-facebook-adlibrary-company-ads';
const SEARCH_PAGES = 'scrapecreators.x.v1-facebook-adlibrary-search-companies';
const DAY_S = 24 * 60 * 60;

type Media = { original_image_url?: string; resized_image_url?: string; video_preview_image_url?: string };

export type RawAd = {
  ad_archive_id?: string;
  collation_count?: number | null;
  page_id?: string;
  page_name?: string;
  is_active?: boolean;
  start_date?: number;
  end_date?: number;
  url?: string;
  snapshot?: Media & {
    page_name?: string;
    title?: string;
    cta_text?: string;
    display_format?: string;
    body?: { text?: string };
    images?: Media[];
    videos?: Media[];
    cards?: (Media & { body?: string; title?: string })[];
  };
};

export type RawPage = { page_id?: string; name?: string; page_alias?: string; ig_username?: string | null; likes?: number };

type AdsPage = { searchResults?: RawAd[]; results?: RawAd[]; cursor?: string };

const firstImage = (s: NonNullable<RawAd['snapshot']>): string | null => {
  const media = [...(s.images ?? []), ...(s.videos ?? []), ...(s.cards ?? [])];
  for (const m of media) {
    const url = m.resized_image_url || m.original_image_url || m.video_preview_image_url;
    if (url) return url;
  }
  return null;
};

/** Null for catalog (DPA) and template ads: no hook or angle to learn from. */
export const toCompetitorAd = (raw: RawAd, keyword: string, nowS: number): CompetitorAd | null => {
  const s = raw.snapshot;
  if (!s || !raw.ad_archive_id) return null;
  const body = s.body?.text || s.cards?.[0]?.body || '';
  if (!body || body.includes('{{') || s.display_format === 'DPA') return null;
  const start = raw.start_date ?? nowS;
  const isActive = raw.is_active ?? true;
  return {
    id: raw.ad_archive_id,
    pageId: raw.page_id ?? '',
    pageName: raw.page_name ?? s.page_name ?? 'Unknown',
    isActive,
    startDate: new Date(start * 1000).toISOString(),
    body,
    title: s.title ?? s.cards?.[0]?.title ?? '',
    cta: s.cta_text ?? '',
    format: s.display_format ?? 'UNKNOWN',
    imageUrl: firstImage(s),
    // A running ad's age is counted to today; a stopped ad's life ends at its last day.
    daysRunning: Math.max(1, Math.round(((isActive ? nowS : raw.end_date ?? nowS) - start) / DAY_S)),
    variants: Math.max(1, raw.collation_count ?? 1),
    libraryUrl: raw.url ?? `https://www.facebook.com/ads/library?id=${raw.ad_archive_id}`,
    keyword,
  };
};

const call = async <T>(endpoint: string, query: Record<string, string>, meter: CostMeter, label: string): Promise<T> => {
  const res = await tregCall<T>(endpoint, { query, timeoutMs: 30_000 });
  meter.add(label, AD_LIBRARY_PAGE_MICROS);
  return res;
};

/** Result pages per keyword. Niche categories have few advertisers, so page 2 matters. */
const PAGES_PER_KEYWORD = 2;

/** Active US ads whose text matches the keyword, in impression order. Page 1 must succeed; page 2 is a bonus. */
export const searchKeyword = async (keyword: string, meter: CostMeter): Promise<RawAd[]> => {
  const base = { query: keyword, country: 'US', status: 'ACTIVE', sort_by: 'total_impressions', trim: 'true' };
  let page = await call<AdsPage>(SEARCH_ADS, base, meter, 'Ad Library keyword search');
  const ads = [...(page.searchResults ?? [])];
  for (let n = 2; n <= PAGES_PER_KEYWORD && page.cursor; n += 1) {
    try {
      page = await call<AdsPage>(SEARCH_ADS, { ...base, cursor: page.cursor }, meter, 'Ad Library keyword search');
      ads.push(...(page.searchResults ?? []));
    } catch (err) {
      console.warn(`[meta-ads] "${keyword}" page ${n} failed:`, err instanceof Error ? err.message : err);
      break;
    }
  }
  return ads;
};

/**
 * An advertiser's US ads, running and stopped (status ALL). Two reads: by impressions (their biggest ads, in reach order)
 * and by most recent (where their quickly stopped tests show up, which the kill window needs). Returns the impression
 * list first, then recent ads it did not include; the recent read is a bonus and may fail.
 */
export const pageAds = async (pageId: string, meter: CostMeter): Promise<{ byReach: RawAd[]; recentOnly: RawAd[] }> => {
  const base = { pageId, country: 'US', status: 'ALL', trim: 'true' };
  const [reach, recent] = await Promise.all([
    call<AdsPage>(PAGE_ADS, { ...base, sort_by: 'total_impressions' }, meter, 'Ad Library advertiser history'),
    call<AdsPage>(PAGE_ADS, { ...base, sort_by: 'relevancy_monthly_grouped' }, meter, 'Ad Library advertiser history').catch(() => ({}) as AdsPage),
  ]);
  const byReach = reach.results ?? reach.searchResults ?? [];
  const seen = new Set(byReach.map((a) => a.ad_archive_id));
  return { byReach, recentOnly: (recent.results ?? recent.searchResults ?? []).filter((a) => !seen.has(a.ad_archive_id)) };
};

export const searchPages = async (name: string, meter: CostMeter): Promise<RawPage[]> =>
  (await call<{ searchResults?: RawPage[] }>(SEARCH_PAGES, { query: name }, meter, 'Ad Library page lookup')).searchResults ?? [];
