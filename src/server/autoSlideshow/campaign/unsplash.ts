// server-only — never import from a 'use client' file.
// Unsplash stock photos for the campaign photo picker (Pexels closed its API). Needs UNSPLASH_ACCESS_KEY.
// Unsplash's API rules this follows: hotlinked thumbnails in the picker, the photographer credited, and the photo's
// download_location called when a photo is used (https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines).

import type { PhotoOptionDto } from '../../../types/admin/slideshowCampaign';
import { HttpError } from '../../http';

const API = 'https://api.unsplash.com';
const PER_PAGE = 30;
/** UTM tags Unsplash asks for on every link back to it. */
const UTM = 'utm_source=next5&utm_medium=referral';

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { raw: string; small: string };
  links: { download_location: string };
  user: { name: string; links: { html: string } };
};

const accessKey = (): string => {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new HttpError(503, 'unsplash_not_configured', 'Photo search is not set up yet: add UNSPLASH_ACCESS_KEY.');
  return key;
};

const call = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Client-ID ${accessKey()}`, 'Accept-Version': 'v1' }, cache: 'no-store' });
  if (res.status === 403) throw new HttpError(429, 'unsplash_limit', 'Photo search is busy. Try again in a few minutes.');
  if (!res.ok) throw new HttpError(502, 'unsplash_failed', `Photo search failed (${res.status}).`);
  return (await res.json()) as T;
};

const creditOf = (p: UnsplashPhoto) => ({ name: p.user.name, url: `${p.user.links.html}?${UTM}` });

/** One page of portrait photos for `query`. */
export const searchUnsplash = async (query: string, page: number): Promise<{ options: PhotoOptionDto[]; hasMore: boolean }> => {
  const q = encodeURIComponent(query.trim().slice(0, 100));
  const data = await call<{ total_pages: number; results: UnsplashPhoto[] }>(`/search/photos?query=${q}&page=${page}&per_page=${PER_PAGE}&orientation=portrait&content_filter=high`);
  return {
    options: data.results.map((p) => ({ key: `unsplash:${p.id}`, thumbUrl: p.urls.small, ref: { source: 'unsplash', id: p.id }, label: p.alt_description ?? 'Unsplash photo', credit: creditOf(p) })),
    hasMore: page < data.total_pages,
  };
};

/**
 * The photo's bytes at slide-photo size (cropped 9:16 by Unsplash's image CDN), its label and credit. Reports the
 * download to Unsplash first, as its rules require for every photo used.
 */
export const fetchUnsplashPhoto = async (id: string): Promise<{ bytes: Buffer; label: string; credit: { name: string; url: string } }> => {
  if (!/^[\w-]{1,40}$/.test(id)) throw new HttpError(400, 'bad_photo', 'Unknown photo.');
  const photo = await call<UnsplashPhoto>(`/photos/${id}`);
  // The download report (an api.unsplash.com URL that needs the key) goes out alongside the image download.
  const [, res] = await Promise.all([
    fetch(photo.links.download_location, { headers: { Authorization: `Client-ID ${accessKey()}` } }).catch(() => undefined),
    fetch(`${photo.urls.raw}&w=1440&h=2560&fit=crop&crop=entropy&fm=jpg&q=85`),
  ]);
  if (!res.ok) throw new HttpError(502, 'unsplash_failed', 'Could not download that photo. Pick another one.');
  return { bytes: Buffer.from(await res.arrayBuffer()), label: photo.alt_description ?? 'Unsplash photo', credit: creditOf(photo) };
};
