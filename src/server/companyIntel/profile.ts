// server-only — never import from a 'use client' file.
// Step 1: read the site with Exa, then turn the page text into a company profile.

import type { BrandProfile } from '../../types/admin/companyIntel';
import { exaFetch } from '../studio/exa';
import { EXA_PAGE_MICROS, type CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';
import { readSiteStyle } from './palette';
import { clip } from '../metaAds/text';

type ExaPage = { url?: string; title?: string; text?: string; image?: string; favicon?: string };

export const normalizeUrl = (raw: string): string => {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  return `${url.protocol}//${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
};

export const domainOf = (url: string): string => new URL(url).hostname.replace(/^www\./, '');

const readSite = async (url: string, meter: CostMeter): Promise<ExaPage> => {
  const data = await exaFetch<{ results?: ExaPage[] }>('/contents', {
    urls: [url],
    text: { maxCharacters: 8_000 },
    livecrawl: 'preferred',
    livecrawlTimeout: 15_000,
  });
  meter.add('Exa page read', EXA_PAGE_MICROS);
  const page = data?.results?.[0];
  if (!page?.text) throw new Error(`Exa could not read ${url}`);
  return page;
};

type LlmProfile = Omit<BrandProfile, 'domain' | 'heroImageUrl' | 'faviconUrl' | 'pageTitle' | 'pageExcerpt' | 'palette'>;

const SYSTEM = `You profile a business from its homepage text for a Meta ads copywriter.
Return JSON: {"brandName": string, "valueProp": string (one sentence, plain words), "audience": string (who buys, one sentence),
"tone": string (3-5 words), "productCategories": string[] (2-4), "searchKeywords": string[] (3 phrases of 2-3 words that a competitor's ad text would contain: what is sold and to whom, category words not the brand name, e.g. "vintage wholesale", "wholesale clothing", "reseller bundles")}.
Use only facts from the text. No hype.`;

const clean = (list: unknown, max: number): string[] =>
  Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim()).slice(0, max) : [];

export const buildProfile = async (url: string, meter: CostMeter): Promise<BrandProfile> => {
  const [page, style] = await Promise.all([readSite(url, meter), readSiteStyle(url)]);
  const raw = await metaAdsJson<Partial<LlmProfile>>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `URL: ${url}\nTitle: ${page.title ?? ''}\n\n${page.text}` },
    ],
    { maxTokens: 4_000, meter, label: 'OpenAI profile' },
  );
  const domain = domainOf(url);
  const keywords = clean(raw.searchKeywords, 3);
  if (!raw.brandName || !raw.valueProp || keywords.length === 0) throw new Error('Profile is missing brandName, valueProp or searchKeywords');
  return {
    brandName: raw.brandName.trim(),
    domain,
    valueProp: raw.valueProp.trim(),
    audience: (raw.audience ?? '').trim(),
    tone: (raw.tone ?? '').trim(),
    productCategories: clean(raw.productCategories, 4),
    searchKeywords: keywords,
    palette: style.palette,
    heroImageUrl: page.image ?? null,
    faviconUrl: page.favicon ?? style.faviconUrl,
    pageTitle: page.title ?? null,
    pageExcerpt: clip(page.text ?? '', 6_000),
  };
};
