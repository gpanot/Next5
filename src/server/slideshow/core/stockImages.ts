// server-only — never import from a 'use client' file.
//
// Stock photo fallback for story shots, for workspaces that have not paid yet (shotImages.ts): no AI image, the shot
// the library could not cover gets a stock photo searched with a short visible scene written for it (stockQueries.ts).
// Pexels first (scraped: campaign/pexels.ts), Unsplash (campaign/unsplash.ts) when Pexels fails or has nothing new.
// Each photo is saved as a library asset of this workspace only (generatedAssets.ts storeShotAsset); it joins the shared
// library once a video using it goes on the calendar (stockApproval.ts). Unsplash downloads are reported as its API
// rules ask; its searches are cached, as the app has 50 calls an hour.

import { downloadPexels, searchPexels } from '../../autoSlideshow/campaign/pexels';
import { unsplashResults } from '../../autoSlideshow/campaign/unsplash';
import { storeShotAsset, type ImageNeed, type ShotImageFile } from './generatedAssets';
import type { LibraryAsset } from './library';
import type { PhotoBrand } from './shotPhotos';
import { writeStockQueries } from './stockQueries';

export { stockQuery } from './stockQueries';

/** Photos already given in this batch, per site, so two shots never get the same stock photo. */
export type StockUsed = { pexels: Set<string>; unsplash: Set<string> };

export const newStockUsed = (): StockUsed => ({ pexels: new Set(), unsplash: new Set() });

const fromPexels = async (query: string, used: StockUsed): Promise<ShotImageFile> => {
  const photo = (await searchPexels(query)).find((p) => !used.pexels.has(p.id));
  if (!photo) throw new Error(`no Pexels photo for "${query}"`);
  used.pexels.add(photo.id);
  return { buffer: await downloadPexels(photo.id), ext: 'jpg', contentType: 'image/jpeg', description: photo.label, source: 'scraped', model: 'pexels' };
};

const fromUnsplash = async (query: string, used: StockUsed): Promise<ShotImageFile> => {
  const photo = (await unsplashResults(query)).find((p) => !used.unsplash.has(p.id));
  if (!photo) throw new Error(`no Unsplash photo for "${query}"`);
  used.unsplash.add(photo.id);
  const file = await photo.download();
  return { buffer: file.bytes, ext: 'jpg', contentType: 'image/jpeg', description: photo.label, source: 'scraped', model: 'unsplash' };
};

/** One shot's stock photo: Pexels, else Unsplash. Throws when neither has one. */
const stockFile = async (query: string, used: StockUsed): Promise<ShotImageFile> => {
  if (!query) throw new Error('no search words');
  return fromPexels(query, used).catch((err: unknown) => {
    console.warn(`[stockImages] Pexels for "${query}" failed, trying Unsplash:`, err instanceof Error ? err.message : err);
    return fromUnsplash(query, used);
  });
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
  brand: PhotoBrand,
  used: StockUsed = newStockUsed(),
): Promise<Map<string, LibraryAsset>> {
  const out = new Map<string, LibraryAsset>();
  if (needs.length === 0) return out;
  const queries = await writeStockQueries(brand, audience, categories, needs);
  const results = await Promise.allSettled(needs.map(async (need) => {
    const query = queries.get(need.key) ?? '';
    const file = await stockFile(query, used);
    return storeShotAsset({ ...file, stock: { query, business: brand.business } }, need, audience, categories, workspaceId);
  }));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out.set(needs[i]!.key, r.value);
    else console.error(`[stockImages] stock photo for ${needs[i]!.key} failed:`, r.reason instanceof Error ? r.reason.message : r.reason);
  });
  console.log(`[stockImages] ${audience}: ${out.size}/${needs.length} stock photo(s)`);
  return out;
}
