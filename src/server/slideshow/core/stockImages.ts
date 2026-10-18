// server-only — never import from a 'use client' file.
//
// Stock photo fallback for story shots, for workspaces that have not paid yet (shotImages.ts): no AI image, the shot
// the library could not cover gets an Unsplash photo (campaign/unsplash.ts) searched with words from its photo
// description. Each photo is saved as a normal library asset (generatedAssets.ts storeShotAsset), so the next deck finds
// it by search like any other. Unsplash since 2026-10-18 (the user's pick): the Pexels scraper behind treg ran out of
// capacity. Its download is reported to Unsplash as its API rules ask; searches are cached, as the app has 50 calls an hour.

import { unsplashResults } from '../../autoSlideshow/campaign/unsplash';
import { storeShotAsset, type ImageNeed, type ShotImageFile } from './generatedAssets';
import type { LibraryAsset } from './library';

/** Words of a photo description that say little about what a stock search should find. */
const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'into', 'over', 'near', 'while',
  'is', 'are', 'their', 'her', 'his', 'its', 'they', 'she', 'he', 'who', 'that', 'this', 'looking', 'photo', 'image', 'shot',
  'close', 'up', 'closeup', 'vertical', 'natural', 'light', 'bright', 'soft', 'warm', 'scene', 'background', 'one', 'two',
]);
const QUERY_WORDS = 4;

/** A short stock search from the shot's photo description (or its line): the first few telling words. */
export const stockQuery = (need: ImageNeed): string =>
  (need.photo?.description ?? need.text)
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, QUERY_WORDS)
    .join(' ');

/** Photos already given in this batch, so two shots never get the same stock photo. */
export type StockUsed = { ids: Set<string> };

export const newStockUsed = (): StockUsed => ({ ids: new Set() });

/** One shot's stock photo: the first search result no other shot of the batch took. Throws when there is none. */
const stockFile = async (need: ImageNeed, used: StockUsed): Promise<ShotImageFile> => {
  const query = stockQuery(need);
  if (!query) throw new Error(`no search words for ${need.key}`);
  const photo = (await unsplashResults(query)).find((p) => !used.ids.has(p.id));
  if (!photo) throw new Error(`no Unsplash photo for "${query}"`);
  used.ids.add(photo.id);
  const file = await photo.download();
  return { buffer: file.bytes, ext: 'jpg', contentType: 'image/jpeg', description: photo.label, source: 'scraped', model: 'unsplash' };
};

/**
 * Stock photos for the shots the library could not cover, in parallel. A shot with no photo found keeps its best
 * library match. `used`: shared by a batch's audiences. Returns key → asset.
 */
export async function stockShotImages(
  audience: string,
  categories: string[],
  needs: ImageNeed[],
  workspaceId: string | null,
  used: StockUsed = newStockUsed(),
): Promise<Map<string, LibraryAsset>> {
  const out = new Map<string, LibraryAsset>();
  if (needs.length === 0) return out;
  const results = await Promise.allSettled(needs.map(async (need) => storeShotAsset(await stockFile(need, used), need, audience, categories, workspaceId)));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out.set(needs[i]!.key, r.value);
    else console.error(`[stockImages] stock photo for ${needs[i]!.key} failed:`, r.reason instanceof Error ? r.reason.message : r.reason);
  });
  console.log(`[stockImages] ${audience}: ${out.size}/${needs.length} stock photo(s)`);
  return out;
}
