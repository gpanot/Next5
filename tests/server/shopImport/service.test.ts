import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { normalizeProducts } from '../../../src/server/shopImport/normalize';
import { connectStore, downloadPendingImages, fetchDetails, importExportFile, ingestCatalog, refreshConnection, setReferenceImage } from '../../../src/server/shopImport/service';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

let dir = '';
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'next5-shop-'));
  process.env.NEXT5_STORAGE = 'local';
  process.env.NEXT5_STORAGE_DIR = dir;
  process.env.NEXT5_SHOP_IMPORT_MOCK = 'true';
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await prisma.$disconnect();
});
beforeEach(resetBusinessTables);
afterEach(() => vi.unstubAllGlobals());

const STORE = 'https://shop.tiktok.com/us/store/flux-hoodies/8652615273314554588';
const webp = () => sharp({ create: { width: 900, height: 1200, channels: 3, background: '#d9c8d2' } }).webp().toBuffer();

describe('TikTok Shop import', () => {
  it('requires the ownership checkbox and a TikTok Shop link', async () => {
    const ws = await createTestWorkspace('shop');
    await expect(connectStore(ws, STORE, false)).rejects.toMatchObject({ code: 'attest_required' });
    await expect(connectStore(ws, 'https://instagram.com/me', true)).rejects.toMatchObject({ code: 'invalid_shop_url' });
    const brand = await createTestWorkspace('brand');
    await expect(connectStore(brand, STORE, true)).rejects.toMatchObject({ code: 'wrong_product' });
  });

  it('imports the catalog once, snapshots sales, downloads reference photos and archives removed products', async () => {
    const ws = await createTestWorkspace('shop');
    const started = await connectStore(ws, STORE, true);
    expect(started).toMatchObject({ status: 'syncing', source: 'scrape', shopUrl: STORE });

    const [a, b] = await Promise.all([refreshConnection(started), refreshConnection(started)]); // webhook + poll race
    expect([a.status, b.status]).toContain('ready');
    const ready = await prisma.shopConnection.findUniqueOrThrow({ where: { id: started.id } });
    expect(ready).toMatchObject({ status: 'ready', productCount: 4, shopName: 'flux hoodies', totalSold: 16872 });
    expect(await prisma.product.count({ where: { workspaceId: ws.id } })).toBe(4);
    expect(await prisma.productSnapshot.count()).toBe(4);

    const image = await webp();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(image))));
    expect(await downloadPendingImages(ws.id)).toBe(4);
    const product = await prisma.product.findFirstOrThrow({ where: { workspaceId: ws.id, externalId: '1732187387400393436' } });
    expect(product.frontR2Key).toContain('/products/');
    expect(product).toMatchObject({ category: 'set', priceCents: 3367, soldCount: 2225 });

    // Re-sync: seller renamed a product; one product left the store, one sold more.
    await prisma.product.update({ where: { id: product.id }, data: { name: 'My set' } });
    const next = normalizeProducts(JSON.parse(JSON.stringify((await import('../../../tests/fixtures/tiktok/store-rows.json')).default))).slice(0, 3);
    next[0]!.soldCount = 2300;
    await ingestCatalog(ready, next, 'tiktok_scrape', null, 50);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after).toMatchObject({ name: 'My set', soldCount: 2300 });
    expect(await prisma.product.count({ where: { workspaceId: ws.id, archivedAt: { not: null } } })).toBe(1);
    expect(await prisma.productSnapshot.count({ where: { productId: product.id } })).toBe(2);
  });

  it('fetches details and lets the seller pick the reference image', async () => {
    const ws = await createTestWorkspace('shop');
    const c = await connectStore(ws, STORE, true);
    await refreshConnection(c);
    const product = await prisma.product.findFirstOrThrow({ where: { workspaceId: ws.id } });
    expect(await fetchDetails(ws, [product.id])).toBe(1);
    const detailed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(detailed.imageUrls.length).toBeGreaterThan(3);
    expect(Array.isArray(detailed.variants)).toBe(true);

    const image = await webp();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(image))));
    await expect(setReferenceImage(ws, product.id, 'https://evil.example/x.jpg')).rejects.toMatchObject({ code: 'unknown_image' });
    await setReferenceImage(ws, product.id, detailed.imageUrls[2]!);
    expect(await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ frontImageUrl: detailed.imageUrls[2] });
  });

  it('imports a Seller Center csv export', async () => {
    const ws = await createTestWorkspace('shop');
    const csv = 'Product ID,Product Name,Price,Main Image\n1,Satin Slip Dress,25.9,https://img.example/a.jpg\n2,Tan Shoulder Bag,40,https://img.example/b.jpg\n';
    const result = await importExportFile(ws, new File([csv], 'export.csv', { type: 'text/csv' }));
    expect(result).toEqual({ imported: 2, missing: [] });
    expect(await prisma.product.findMany({ where: { workspaceId: ws.id }, orderBy: { name: 'asc' }, select: { name: true, category: true, source: true } })).toEqual([
      { name: 'Satin Slip Dress', category: 'dress', source: 'tiktok_export' },
      { name: 'Tan Shoulder Bag', category: 'bag', source: 'tiktok_export' },
    ]);
  });
});
