// server-only — never import from a 'use client' file.
// Unsplash stock photos for the campaign photo picker, Auto content and free Blitz story shots
// (slideshow/core/stockImages.ts; Pexels closed its API and its scraper was dropped 2026-10-18). Needs UNSPLASH_API_KEY
// (the app's Access Key; UNSPLASH_ACCESS_KEY also works). The app is limited to 50 API calls an hour, so searches are
// kept for 10 minutes and Auto uses a search result as it is (no second call for the photo).
// Unsplash's API rules this follows: photos shown from Unsplash's URLs (the picker, and attached photos: `hotlink`; our
// copy only feeds the render), "Photo by <name> on Unsplash" with both links, and the photo's download_location called
// when a photo is used (https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines).

import type { PhotoOptionDto } from '../../../types/admin/slideshowCampaign';
import { HttpError } from '../../http';

const API = 'https://api.unsplash.com';
const PER_PAGE = 30;
/** UTM tags Unsplash asks for on every link back to it. */
const UTM = 'utm_source=next5&utm_medium=referral';

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { raw: string; small: string; regular: string };
  links: { download_location: string };
  user: { name: string; links: { html: string } };
};

const accessKey = (): string => {
  const key = process.env.UNSPLASH_API_KEY ?? process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new HttpError(503, 'unsplash_not_configured', 'Photo search is not set up yet: add UNSPLASH_API_KEY.');
  return key;
};

const call = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Client-ID ${accessKey()}`, 'Accept-Version': 'v1' }, cache: 'no-store' });
  if (res.status === 403 || res.status === 429) throw new HttpError(429, 'unsplash_limit', 'Photo search is busy. Try again in a few minutes.');
  if (!res.ok) throw new HttpError(502, 'unsplash_failed', `Photo search failed (${res.status}).`);
  return (await res.json()) as T;
};

const creditOf = (p: UnsplashPhoto) => ({ name: p.user.name, url: `${p.user.links.html}?${UTM}` });

type SearchPage = { total_pages: number; results: UnsplashPhoto[] };
const SEARCH_TTL_MS = 10 * 60_000;
const searches = new Map<string, { at: number; page: Promise<SearchPage> }>();

/** One search page, from this instance's cache when asked in the last 10 minutes (a failed call is not kept). */
const searchPage = (query: string, page: number): Promise<SearchPage> => {
  const key = `${query.trim().toLowerCase().slice(0, 100)}|${page}`;
  const hit = searches.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) return hit.page;
  const q = encodeURIComponent(query.trim().slice(0, 100));
  const next = call<SearchPage>(`/search/photos?query=${q}&page=${page}&per_page=${PER_PAGE}&orientation=portrait&content_filter=high`);
  searches.set(key, { at: Date.now(), page: next });
  next.catch(() => searches.delete(key));
  if (searches.size > 200) searches.delete(searches.keys().next().value!);
  return next;
};

/** One page of portrait photos for `query`. */
export const searchUnsplash = async (query: string, page: number): Promise<{ options: PhotoOptionDto[]; hasMore: boolean }> => {
  const data = await searchPage(query, page);
  return {
    options: data.results.map((p) => ({ key: `unsplash:${p.id}`, thumbUrl: p.urls.small, ref: { source: 'unsplash', id: p.id }, label: p.alt_description ?? 'Unsplash photo', credit: creditOf(p) })),
    hasMore: page < data.total_pages,
  };
};

/** `hotlink`: Unsplash's own URLs, which the app shows instead of our copy (its API rules: photos are hotlinked). */
type Downloaded = { bytes: Buffer; label: string; credit: { name: string; url: string }; hotlink: { thumb: string; full: string } };

/** The photo's bytes at slide-photo size (cropped 9:16 by Unsplash's image CDN), reporting the download to Unsplash
 *  alongside, as its rules require for every photo used. */
const download = async (photo: UnsplashPhoto): Promise<Downloaded> => {
  const [, res] = await Promise.all([
    fetch(photo.links.download_location, { headers: { Authorization: `Client-ID ${accessKey()}` } }).catch(() => undefined),
    fetch(`${photo.urls.raw}&w=1440&h=2560&fit=crop&crop=entropy&fm=jpg&q=85`),
  ]);
  if (!res.ok) throw new HttpError(502, 'unsplash_failed', 'Could not download that photo. Pick another one.');
  return {
    bytes: Buffer.from(await res.arrayBuffer()),
    label: photo.alt_description ?? 'Unsplash photo',
    credit: creditOf(photo),
    hotlink: { thumb: photo.urls.small, full: photo.urls.regular },
  };
};

/** A photo picked in the picker, by id. */
export const fetchUnsplashPhoto = async (id: string): Promise<Downloaded> => {
  if (!/^[\w-]{1,40}$/.test(id)) throw new HttpError(400, 'bad_photo', 'Unknown photo.');
  return download(await call<UnsplashPhoto>(`/photos/${id}`));
};

/** Auto content: the `nth` result of the search (looping), downloaded straight from the search result. */
export const searchedUnsplashPhoto = async (query: string, nth: number): Promise<Downloaded> => {
  const { results } = await searchPage(query, 1);
  const photo = results[nth % Math.max(1, results.length)];
  if (!photo) throw new HttpError(404, 'no_stock_photo', `No stock photo found for "${query}". Pick one by hand.`);
  return download(photo);
};

/** One search result for the Blitz stock shots: its id, its description, and its download (reported to Unsplash). */
export type UnsplashResult = { id: string; label: string; download: () => Promise<Downloaded> };

/** The first page of portrait results for `query` (cached 10 minutes, so shots of a batch share searches). */
export const unsplashResults = async (query: string): Promise<UnsplashResult[]> =>
  (await searchPage(query, 1)).results.map((p) => ({ id: p.id, label: p.alt_description ?? query, download: () => download(p) }));
