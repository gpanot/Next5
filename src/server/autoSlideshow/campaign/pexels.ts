// server-only — never import from a 'use client' file.
// Pexels stock photos without an API (Pexels closed it): the public search page, fetched through treg with a browser
// (pexels.com answers plain server requests with a Cloudflare 403), read from its images list. Litescrape first
// ($0.00015 a search); Linkup with JavaScript rendered ($0.005, about 10 s) when Litescrape fails. Litescrape's treg
// account ran dry twice (402 insufficient_credits, 2026-10-18 and 19): after a failure it is skipped for 10 minutes.
// Linkup answers 429 when many searches start together, so at most 3 searches run at once.
// Photos then download straight from Pexels' image CDN, cropped 9:16 there. Searches are kept for 10 minutes on this
// instance, like Unsplash's.

import { tregJson, withRetry } from '../../shorts/treg';

const LITESCRAPE = 'litescrape.web.fetch.post';
const LINKUP = 'linkup.web.fetch';
const SEARCH_TTL_MS = 10 * 60_000;
const LITESCRAPE_PAUSE_MS = 10 * 60_000;
const MAX_IN_FLIGHT = 3;
/** Result alt texts look like "Free <description> Stock Photo" ("Image 3: Free …" from Litescrape); ads, iStock tiles
 *  and suggestions do not. */
const RESULT_ALT = /^(?:Image \d+: )?Free (.+?) Stock Photo$/;
const PHOTO_ID = /images\.pexels\.com\/photos\/(\d+)\//;

export type PexelsPhoto = { id: string; label: string };
/** One image of a page: its alt text and URL. */
type PageImage = { alt?: string; url?: string };
/** Litescrape lists images as alt → URL; Linkup as a list. */
type LitescrapeBody = { images?: Record<string, string> };
type LinkupBody = { images?: PageImage[] };

const searches = new Map<string, { at: number; photos: Promise<PexelsPhoto[]> }>();

let inFlight = 0;
const waiting: Array<() => void> = [];

/** Runs `fn` when fewer than MAX_IN_FLIGHT searches are running. */
const limited = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => waiting.push(resolve));
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
};

/** Litescrape is skipped until then, after it failed. */
let litescrapeDownUntil = 0;

const viaLitescrape = async (url: string): Promise<PageImage[]> => {
  const { data } = await tregJson<LitescrapeBody>(LITESCRAPE, {
    query: { timeout: '60' },
    body: { url, respond_with: 'text', with_images_summary: true, retain_images: 'none', engine: 'browser', max_tokens: 500 },
    timeoutMs: 70_000,
  });
  return Object.entries(data.images ?? {}).map(([alt, src]) => ({ alt, url: src }));
};

const viaLinkup = async (url: string): Promise<PageImage[]> => {
  const fetchPage = () => tregJson<LinkupBody>(LINKUP, { body: { url, renderJs: true, extractImages: true }, timeoutMs: 70_000 });
  // Linkup sometimes answers 400 FETCH_TARGET_UNREACHABLE for a page it reaches on the next try.
  const once = () => withRetry(fetchPage, 3);
  const { data } = await once().catch((err: unknown) => {
    if (err instanceof Error && err.message.includes('FETCH_TARGET_UNREACHABLE')) return once();
    throw err;
  });
  return data.images ?? [];
};

/** The search page's images: Litescrape, else Linkup. A Litescrape page with no result falls through too. */
const pageImages = async (url: string): Promise<PageImage[]> => {
  if (Date.now() >= litescrapeDownUntil) {
    try {
      const images = await viaLitescrape(url);
      if (images.some((im) => RESULT_ALT.test(im.alt ?? ''))) return images;
    } catch (err) {
      litescrapeDownUntil = Date.now() + LITESCRAPE_PAUSE_MS;
      console.warn('[pexels] Litescrape failed, using Linkup for 10 minutes:', err instanceof Error ? err.message.slice(0, 200) : err);
    }
  }
  return viaLinkup(url);
};

/** Portrait results of one search page, in Pexels' order, without duplicates. */
const scrape = async (query: string): Promise<PexelsPhoto[]> => {
  const images = await limited(() => pageImages(`https://www.pexels.com/search/${encodeURIComponent(query)}/?orientation=portrait`));
  const seen = new Set<string>();
  return images.flatMap(({ alt, url: src }) => {
    const label = RESULT_ALT.exec(alt ?? '')?.[1];
    const id = PHOTO_ID.exec(src ?? '')?.[1];
    if (!label || !id || seen.has(id)) return [];
    seen.add(id);
    return [{ id, label }];
  });
};

/** Portrait photos for `query`, from this instance's cache when searched in the last 10 minutes. */
export const searchPexels = (query: string): Promise<PexelsPhoto[]> => {
  const q = query.trim().toLowerCase().slice(0, 80);
  const hit = searches.get(q);
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) return hit.photos;
  const photos = scrape(q);
  searches.set(q, { at: Date.now(), photos });
  photos.catch(() => searches.delete(q));
  if (searches.size > 200) searches.delete(searches.keys().next().value!);
  return photos;
};

/** The photo at slide size (1080×1920, cropped by Pexels' CDN) as JPEG bytes. */
export const downloadPexels = async (id: string): Promise<Buffer> => {
  const res = await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1080&h=1920`);
  if (!res.ok) throw new Error(`Pexels photo ${id}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};
