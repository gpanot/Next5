/**
 * Campaign Studio — site crawl for profile extraction.
 *
 * 1. In parallel: raw homepage HTML → internal links + labels (free; keeps the nav menu Exa's
 *    text drops), and the Exa homepage crawl with its link list (for sites that block us).
 * 2. gpt-4o-mini picks up to 3 pages that best show who the business serves.
 * 3. A second Exa /contents call crawls those pages.
 * The combined text (menu labels + pages) feeds inference AND the evidence check, so a niche
 * named only in the menu ("Industries → Electricians") still counts as evidenced.
 */
// server-only
import { chatJson } from '../ai/openai';
import { crawlPages, EXA_CONTENTS_COST_MICROS } from './exa';
import { fetchSiteLinks, linksFromHrefs, type SiteLink } from './siteLinks';

const MAX_SUBPAGES = 3;
const HOME_CHARS = 3_500;
const SUBPAGE_CHARS = 1_800;
const MAX_MENU_LINES = 40;
/** gpt-4o-mini page-pick call: ~$0.0002. */
const PICK_COST_MICROS = 200;

/** Deterministic fallback when the pick call fails: pages whose path or label says who they serve. */
const AUDIENCE_HINT = /industr|who-?we|we-?serve|serve|solution|service|customer|client|about|for-/i;

export type SiteCrawl = {
  /** Combined text for inference and evidence checks; null when the homepage could not be crawled. */
  text: string | null;
  /** Subpages crawled in addition to the homepage. */
  pages: string[];
  durationMs: number;
  costUsdMicros: number;
};

async function pickPages(links: SiteLink[]): Promise<string[]> {
  if (links.length === 0) return [];
  const listing = links.map((l, i) => `${i + 1}. ${l.label} — ${new URL(l.url).pathname}`).join('\n');

  const result = await chatJson<{ pages?: unknown[] }>(
    [
      {
        role: 'system',
        content: `You pick pages from a business website's links to learn who the business sells to and what it does.
Prefer, in order: industry / "who we serve" / solutions-by-customer pages, then services or products overview, then about.
Skip blog posts, pricing, contact, careers, legal, and login pages.
Return at most ${MAX_SUBPAGES} link numbers. Return JSON only: { "pages": [1, 4] }`,
      },
      { role: 'user', content: listing },
    ],
    { maxTokens: 40, temperature: 0, model: 'gpt-4o-mini' },
  );

  const picked = (Array.isArray(result?.pages) ? result.pages : [])
    .map((n) => (typeof n === 'number' ? links[n - 1]?.url : undefined))
    .filter((u): u is string => Boolean(u));
  if (picked.length > 0) return [...new Set(picked)].slice(0, MAX_SUBPAGES);

  return links.filter((l) => AUDIENCE_HINT.test(`${l.url} ${l.label}`)).map((l) => l.url).slice(0, MAX_SUBPAGES);
}

export async function crawlSite(sourceUrl: string): Promise<SiteCrawl> {
  const t0 = Date.now();
  const [rawLinks, [homePage]] = await Promise.all([
    fetchSiteLinks(sourceUrl),
    crawlPages([sourceUrl], { maxCharacters: HOME_CHARS, links: 60 }),
  ]);
  const home = homePage?.text ?? null;
  if (!home) return { text: null, pages: [], durationMs: Date.now() - t0, costUsdMicros: 0 };

  // Raw HTML has real menu labels; Exa's list is the fallback when the site blocks our fetch.
  const links = rawLinks.length > 0 ? rawLinks : linksFromHrefs(homePage!.links, sourceUrl);
  const subpages = await pickPages(links);
  console.log(`[studio/site] ${rawLinks.length > 0 ? 'html' : 'exa'} links=${links.length}; crawling homepage + ${JSON.stringify(subpages)}`);
  const pages = await crawlPages(subpages, { maxCharacters: SUBPAGE_CHARS });

  const fetched = 1 + pages.filter((p) => p.text).length;
  const costUsdMicros = (links.length > 0 ? PICK_COST_MICROS : 0) + fetched * EXA_CONTENTS_COST_MICROS;

  const sections: string[] = [];
  if (links.length > 0) {
    const menu = links.slice(0, MAX_MENU_LINES).map((l) => `${l.label} — ${new URL(l.url).pathname}`);
    sections.push(`## Site menu and links\n${menu.join('\n')}`);
  }
  sections.push(`## Homepage\n${home}`);
  const crawled: string[] = [];
  for (const p of pages) {
    if (!p.text) continue;
    crawled.push(p.url);
    sections.push(`## Page ${new URL(p.url).pathname}\n${p.text}`);
  }

  return { text: sections.join('\n\n'), pages: crawled, durationMs: Date.now() - t0, costUsdMicros };
}
