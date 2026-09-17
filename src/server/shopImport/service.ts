// server-only — never import from a 'use client' file.
// TikTok Shop catalog import: connect → run → ingest (upsert, archive, snapshots) → download reference images.

import { Prisma, type ShopConnection, type Workspace } from '@prisma/client';
import sharp from 'sharp';
import { PLANS, isPlanId } from '../../config/plans';
import { prisma } from '../../lib/db';
import { getActivePlan } from '../generation/createBatch';
import { HttpError } from '../http';
import { productKey } from '../storage/keys';
import { putObject } from '../storage/objectStore';
import { apifyWebhookUrl } from '../apify/client';
import { fetchProductDetails, getDatasetItems, getRun, isShopImportMock, startStoreRun, type ApifyRow } from './apify';
import { normalizeProducts, normalizeStore, parseShopUrl, type NormalizedProduct } from './normalize';

const DAY = 86_400_000;
export const SYNC_EVERY_MS = 7 * DAY;
type ProductSource = 'tiktok_scrape' | 'tiktok_export';

/** Hard ceiling on products pulled from TikTok per run (keeps scraper spend down while testing). Raise with NEXT5_SHOP_IMPORT_MAX. */
export const importMax = (): number => {
  const n = Number.parseInt(process.env.NEXT5_SHOP_IMPORT_MAX ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
};

/** Products imported per store: the plan's allowance (no plan: 50) — never above importMax(). */
export const importCapFor = (planId: string | null | undefined): number =>
  Math.min(planId && isPlanId(planId) && PLANS[planId].storeProducts > 0 ? PLANS[planId].storeProducts : 50, importMax());

const requireShop = (ws: Workspace) => {
  if (ws.product !== 'shop') throw new HttpError(400, 'wrong_product', 'Store import is part of Shop Studio.');
};

/** Resolves a product link to its store link (one cheap detail lookup). */
const storeUrlFor = async (rawUrl: string): Promise<{ url: string; sellerId: string | null }> => {
  const parsed = parseShopUrl(rawUrl);
  if (!parsed) throw new HttpError(400, 'invalid_shop_url', 'Paste your TikTok Shop store link, like shop.tiktok.com/us/store/your-shop/123….');
  if (parsed.kind === 'store') return { url: parsed.url, sellerId: parsed.sellerId };
  const [detail] = await fetchProductDetails([parsed.url]);
  const shopUrl = detail?.shopUrl ? parseShopUrl(String(detail.shopUrl)) : null;
  if (!shopUrl || shopUrl.kind !== 'store') throw new HttpError(422, 'store_not_found', 'We could not find the store for that product link. Paste the store link instead.');
  return { url: shopUrl.url, sellerId: shopUrl.sellerId };
};

/** Starts (or restarts) the store import. The seller must confirm they own or manage the store. */
export const connectStore = async (ws: Workspace, rawUrl: string, attest: boolean, now = new Date()): Promise<ShopConnection> => {
  requireShop(ws);
  if (!attest) throw new HttpError(400, 'attest_required', 'Confirm that you own or manage this shop.');
  const store = await storeUrlFor(rawUrl);
  const plan = await getActivePlan(ws.id, now);
  const { runId } = await startStoreRun(store.url, importCapFor(plan?.id), apifyWebhookUrl());
  return prisma.shopConnection.upsert({
    where: { workspaceId_platform: { workspaceId: ws.id, platform: 'tiktok_shop' } },
    update: { source: 'scrape', shopUrl: store.url, externalShopId: store.sellerId, status: 'syncing', runId, error: null, ownerAttestedAt: now },
    create: { workspaceId: ws.id, source: 'scrape', shopUrl: store.url, externalShopId: store.sellerId, status: 'syncing', runId, ownerAttestedAt: now },
  });
};

/** Re-runs the import for an existing scrape connection. */
export const syncStore = async (connection: ShopConnection): Promise<ShopConnection> => {
  if (connection.source !== 'scrape' || !connection.shopUrl) throw new HttpError(409, 'sync_unavailable', 'Upload a new export file to update this store.');
  if (connection.status === 'syncing') return connection;
  const plan = await getActivePlan(connection.workspaceId);
  const { runId } = await startStoreRun(connection.shopUrl, importCapFor(plan?.id), apifyWebhookUrl());
  return prisma.shopConnection.update({ where: { id: connection.id }, data: { status: 'syncing', runId, error: null } });
};

const upsertProduct = (tx: Prisma.TransactionClient, workspaceId: string, source: ProductSource, p: NormalizedProduct, now: Date) =>
  tx.product.upsert({
    where: { workspaceId_source_externalId: { workspaceId, source, externalId: p.externalId } },
    create: {
      workspaceId, source, externalId: p.externalId, name: p.title.slice(0, 80), category: p.category, frontR2Key: '',
      externalUrl: p.externalUrl, categoryPath: p.categoryPath, description: p.description, priceCents: p.priceCents, currency: p.currency,
      soldCount: p.soldCount, imageUrls: p.imageUrls, frontImageUrl: p.imageUrls[0] ?? null,
      variants: p.variants ?? Prisma.DbNull, specifications: p.specifications ?? Prisma.DbNull, importedAt: now, lastSyncedAt: now,
      detailsFetchedAt: p.variants ? now : null,
    },
    // Name, category and the chosen reference image are the seller's to edit — a sync never overwrites them.
    update: {
      externalUrl: p.externalUrl, priceCents: p.priceCents, currency: p.currency, soldCount: p.soldCount, lastSyncedAt: now,
      ...(p.variants ? { variants: p.variants, specifications: p.specifications ?? Prisma.DbNull, description: p.description, categoryPath: p.categoryPath, detailsFetchedAt: now } : {}),
    },
    select: { id: true, soldCount: true, priceCents: true, imageUrls: true },
  });

/** Upserts the catalog, snapshots sold counts, archives products that left the store, and marks the connection ready. */
export const ingestCatalog = async (connection: ShopConnection, products: NormalizedProduct[], source: ProductSource, store: ReturnType<typeof normalizeStore>, cap: number, now = new Date()): Promise<number> => {
  const ids: string[] = [];
  for (let i = 0; i < products.length; i += 50) {
    const chunk = products.slice(i, i + 50);
    const saved = await prisma.$transaction(chunk.map((p) => upsertProduct(prisma, connection.workspaceId, source, p, now)));
    for (const [j, row] of saved.entries()) {
      ids.push(row.id);
      // Keep the listing images fresh without overwriting a longer detail set.
      if (row.imageUrls.length < chunk[j]!.imageUrls.length) await prisma.product.update({ where: { id: row.id }, data: { imageUrls: chunk[j]!.imageUrls } });
    }
    await prisma.productSnapshot.createMany({ data: saved.map((row) => ({ productId: row.id, soldCount: row.soldCount, priceCents: row.priceCents, capturedAt: now })) });
  }
  // Products still in the store come back, unless the seller archived them by hand.
  await prisma.product.updateMany({ where: { id: { in: ids }, archivedAt: { not: null }, archivedBySeller: false }, data: { archivedAt: null } });
  // Only a complete catalog (below the cap) tells us which products left the store.
  if (products.length > 0 && products.length < cap) {
    await prisma.product.updateMany({ where: { workspaceId: connection.workspaceId, source, id: { notIn: ids }, archivedAt: null }, data: { archivedAt: now } });
  }
  await prisma.shopConnection.update({
    where: { id: connection.id },
    data: {
      status: 'ready', runId: null, error: null, productCount: ids.length, lastSyncedAt: now, nextSyncAt: new Date(now.getTime() + SYNC_EVERY_MS),
      ...(store ? { shopName: store.shopName, shopLogoUrl: store.logoUrl, totalSold: store.totalSold, externalShopId: store.externalShopId ?? connection.externalShopId } : {}),
    },
  });
  return ids.length;
};

const failConnection = (connection: ShopConnection, message: string) =>
  prisma.shopConnection.update({ where: { id: connection.id }, data: { status: 'failed', runId: null, error: message.slice(0, 300) } });

/** Poll fallback and webhook handler: when the run finished, ingest it. Safe to call repeatedly. */
export const refreshConnection = async (connection: ShopConnection, now = new Date()): Promise<ShopConnection> => {
  if (connection.status !== 'syncing' || !connection.runId) return connection;
  const run = await getRun(connection.runId);
  if (run.status === 'running') return connection;
  if (run.status === 'failed' || !run.datasetId) {
    await failConnection(connection, run.message ?? 'The store import failed. Try again in a few minutes.');
  } else {
    // Claim the run so a webhook and a poll can't ingest it twice.
    const claimed = await prisma.shopConnection.updateMany({ where: { id: connection.id, runId: connection.runId }, data: { runId: `ingesting:${connection.runId}` } });
    if (claimed.count === 0) return prisma.shopConnection.findUniqueOrThrow({ where: { id: connection.id } });
    try {
      const rows: ApifyRow[] = await getDatasetItems(run.datasetId);
      const products = normalizeProducts(rows);
      if (products.length === 0) await failConnection(connection, 'We found no products in this store. Check the link, or upload your product export.');
      else {
        const plan = await getActivePlan(connection.workspaceId, now);
        await ingestCatalog(connection, products, 'tiktok_scrape', normalizeStore(rows), importCapFor(plan?.id), now);
      }
    } catch (err) {
      await failConnection(connection, err instanceof Error ? err.message : 'Import failed');
    }
  }
  return prisma.shopConnection.findUniqueOrThrow({ where: { id: connection.id } });
};

/** Downloads a listing image and stores it as the product's front (reference) photo. */
const storeReference = async (workspaceId: string, productId: string, url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const key = productKey(workspaceId, productId, 'front');
  await putObject(key, jpeg);
  return key;
};

/** Background: fetch reference photos for imported products that don't have one yet. Returns how many were stored. */
export const downloadPendingImages = async (workspaceId: string, limit = 24): Promise<number> => {
  const pending = await prisma.product.findMany({ where: { workspaceId, frontR2Key: '', archivedAt: null, frontImageUrl: { not: null } }, take: limit, orderBy: { soldCount: { sort: 'desc', nulls: 'last' } } });
  let done = 0;
  for (let i = 0; i < pending.length; i += 6) {
    await Promise.all(pending.slice(i, i + 6).map(async (p) => {
      try {
        const key = await storeReference(workspaceId, p.id, p.frontImageUrl!);
        await prisma.product.update({ where: { id: p.id }, data: { frontR2Key: key } });
        done += 1;
      } catch (err) {
        console.error('[shopImport] image', p.id, err instanceof Error ? err.message : err);
      }
    }));
  }
  return done;
};

/** Seller picks which listing image is the product reference (e.g. the cleanest, without text overlays). */
export const setReferenceImage = async (ws: Workspace, productId: string, imageUrl: string): Promise<void> => {
  requireShop(ws);
  const product = await prisma.product.findFirst({ where: { id: productId, workspaceId: ws.id } });
  if (!product) throw new HttpError(404, 'product_not_found', 'Product not found.');
  if (!product.imageUrls.includes(imageUrl)) throw new HttpError(400, 'unknown_image', 'Pick one of this product’s images.');
  const key = await storeReference(ws.id, product.id, imageUrl);
  await prisma.product.update({ where: { id: product.id }, data: { frontImageUrl: imageUrl, frontR2Key: key } });
};

/** All 9 images, variants, category and specs for selected imported products (≤ 20 per call). */
export const fetchDetails = async (ws: Workspace, productIds: string[], now = new Date()): Promise<number> => {
  requireShop(ws);
  const products = await prisma.product.findMany({ where: { id: { in: productIds.slice(0, Math.min(20, importMax())) }, workspaceId: ws.id, externalUrl: { not: null } } });
  if (products.length === 0) return 0;
  const rows = await fetchProductDetails(products.map((p) => p.externalUrl!));
  const byId = new Map(normalizeProducts(rows).map((p) => [p.externalId, p]));
  let updated = 0;
  for (const product of products) {
    const d = byId.get(product.externalId ?? '');
    if (!d) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrls: d.imageUrls.length ? d.imageUrls : product.imageUrls, variants: d.variants ?? Prisma.DbNull, specifications: d.specifications ?? Prisma.DbNull, description: d.description, categoryPath: d.categoryPath, detailsFetchedAt: now },
    });
    updated += 1;
  }
  return updated;
};

/** Daily cron: re-sync scrape connections that are due (weekly, on plans with drops: Growth, Scale, Agency). */
export const syncDueConnections = async (now = new Date(), limit = 20): Promise<number> => {
  const due = await prisma.shopConnection.findMany({ where: { source: 'scrape', status: { in: ['ready', 'failed'] }, nextSyncAt: { lte: now } }, take: limit });
  let started = 0;
  for (const c of due) {
    const plan = await getActivePlan(c.workspaceId, now);
    if (!plan?.drops) {
      await prisma.shopConnection.update({ where: { id: c.id }, data: { nextSyncAt: new Date(now.getTime() + SYNC_EVERY_MS) } });
      continue;
    }
    await syncStore(c).then(() => (started += 1)).catch((err: unknown) => console.error('[shopImport] sync', c.id, err));
  }
  return started;
};

export { isShopImportMock };

/** Seller Center export (xlsx/csv) → catalog. Returns the product count, or the columns we could not find. */
export const importExportFile = async (ws: Workspace, file: File, now = new Date()): Promise<{ imported: number; missing: string[] }> => {
  requireShop(ws);
  if (file.size === 0 || file.size > 15 * 1024 * 1024) throw new HttpError(400, 'invalid_file', 'Upload your product export (xlsx or csv, up to 15 MB).');
  const { parseCsv, parseExportRows } = await import('./exportFile');
  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: (string | number | boolean | Date | null)[][];
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') rows = parseCsv(buffer.toString('utf8'));
  else {
    const { readSheet } = await import('read-excel-file/node');
    rows = (await readSheet(buffer)) as (string | number | boolean | Date | null)[][];
  }
  const { products, missing } = parseExportRows(rows);
  if (missing.length) return { imported: 0, missing };
  if (products.length === 0) throw new HttpError(422, 'no_products', 'We found no products with images in this file.');
  const plan = await getActivePlan(ws.id, now);
  const cap = importCapFor(plan?.id);
  const connection = await prisma.shopConnection.upsert({
    where: { workspaceId_platform: { workspaceId: ws.id, platform: 'tiktok_shop' } },
    update: { source: 'export', status: 'syncing', error: null },
    create: { workspaceId: ws.id, source: 'export', status: 'syncing' },
  });
  const imported = await ingestCatalog(connection, products.slice(0, cap), 'tiktok_export', null, Number.POSITIVE_INFINITY, now);
  return { imported, missing: [] };
};
