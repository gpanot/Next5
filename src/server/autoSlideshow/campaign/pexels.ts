// server-only — never import from a 'use client' file.
// Pexels stock photos without an API (Pexels closed it): the public search page, fetched through treg's Litescrape
// browser (pexels.com answers plain server requests with a Cloudflare 403), read from its images list. ~$0.00015 a
// search, about 10 s. Photos then download straight from Pexels' image CDN, cropped 9:16 there. Searches are kept for
// 10 minutes on this instance, like Unsplash's.

import { tregJson, withRetry } from '../../shorts/treg';

const ENDPOINT = 'litescrape.web.fetch.post';
const SEARCH_TTL_MS = 10 * 60_000;
/** Search result alt texts look like "Free <description> Stock Photo"; ads and Canva/iStock tiles do not. */
const RESULT_ALT = /^Image \d+: Free (.+?) Stock Photo$/;
const PHOTO_ID = /images\.pexels\.com\/photos\/(\d+)\//;

export type PexelsPhoto = { id: string; label: string };
type ScrapeBody = { images?: Record<string, string> };

const searches = new Map<string, { at: number; photos: Promise<PexelsPhoto[]> }>();

/** Portrait results of one search page, in Pexels' order, without duplicates. */
const scrape = async (query: string): Promise<PexelsPhoto[]> => {
  const url = `https://www.pexels.com/search/${encodeURIComponent(query)}/?orientation=portrait`;
  const { data } = await withRetry(() => tregJson<ScrapeBody>(ENDPOINT, {
    query: { timeout: '60' },
    body: { url, respond_with: 'text', with_images_summary: true, retain_images: 'none', engine: 'browser', max_tokens: 500 },
    timeoutMs: 70_000,
  }), 2);
  const seen = new Set<string>();
  return Object.entries(data.images ?? {}).flatMap(([alt, src]) => {
    const label = RESULT_ALT.exec(alt)?.[1];
    const id = PHOTO_ID.exec(src)?.[1];
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
