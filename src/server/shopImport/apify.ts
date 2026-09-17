// server-only — never import from a 'use client' file.
// Apify TikTok Shop scraper (V1 bridge until the official TikTok Shop API — decision D14, spike P15.0).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { APIFY_API as API, apifyCall as call, getApifyDataset, getApifyRun, webhooksParam, type ApifyRow, type RunState } from '../apify/client';

const actor = (): string => process.env.APIFY_SHOP_ACTOR ?? 'pro100chok~tiktok-shop-scraper-usage';

export type { ApifyRow, RunState };

/** Replays the spike fixtures instead of calling Apify (local dev, tests, no credit spent). */
export const isShopImportMock = (): boolean => process.env.NEXT5_SHOP_IMPORT_MOCK === 'true' || (!process.env.APIFY_TOKEN && process.env.NODE_ENV !== 'production');

const fixture = async (name: string): Promise<ApifyRow[]> =>
  JSON.parse(await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), 'tests', 'fixtures', 'tiktok', name), 'utf8')) as ApifyRow[];

/** Starts an async store catalog run. Apify calls `webhookUrl` when it ends (poll `getRun` as a fallback). */
export const startStoreRun = async (storeUrl: string, maxItems: number, webhookUrl: string | null): Promise<{ runId: string }> => {
  if (isShopImportMock()) return { runId: `mock-run-${Date.now()}` };
  const webhooks = webhooksParam(webhookUrl);
  const body = { region: 'us', scrapeType: 'store', storeUrls: [storeUrl], maxItems };
  const { data } = await call<{ data: { id: string } }>(`${API}/acts/${actor()}/runs?timeout=600${webhooks}`, { method: 'POST', body: JSON.stringify(body) });
  return { runId: data.id };
};

export const getRun = async (runId: string): Promise<RunState> => {
  if (runId.startsWith('mock-run-')) return { status: 'succeeded', datasetId: 'mock-store', message: null };
  return getApifyRun(runId);
};

export const getDatasetItems = async (datasetId: string): Promise<ApifyRow[]> => {
  if (datasetId === 'mock-store') return fixture('store-rows.json');
  return getApifyDataset(datasetId);
};

/** Full product details (9 images, variants, category, specs) for a few product URLs. Synchronous; ≤ 20 URLs. */
export const fetchProductDetails = async (productUrls: string[]): Promise<ApifyRow[]> => {
  if (productUrls.length === 0) return [];
  if (isShopImportMock()) {
    const rows = await fixture('product-details.json');
    return productUrls.map((url, i) => ({ ...rows[i % rows.length], productUrl: url, productId: url.match(/(\d{6,})/)?.[1] ?? rows[i % rows.length]!.productId }));
  }
  const urls = productUrls.slice(0, 20);
  const body = { region: 'us', scrapeType: 'product', productUrls: urls, maxItems: urls.length };
  return call<ApifyRow[]>(`${API}/acts/${actor()}/run-sync-get-dataset-items?timeout=240`, { method: 'POST', body: JSON.stringify(body) });
};
