import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { colorwaysWithImages, dedupeImages, mapCategory, normalizeProducts, normalizeStore, parseShopUrl, splitVariantName } from '../../../src/server/shopImport/normalize';

const load = (name: string) => JSON.parse(readFileSync(`tests/fixtures/tiktok/${name}`, 'utf8')) as Record<string, unknown>[];

describe('parseShopUrl', () => {
  it('reads store and product URLs', () => {
    expect(parseShopUrl('https://shop.tiktok.com/us/store/flux-hoodies/8652615273314554588?source=x')).toEqual({ kind: 'store', url: 'https://shop.tiktok.com/us/store/flux-hoodies/8652615273314554588', slug: 'flux-hoodies', sellerId: '8652615273314554588' });
    expect(parseShopUrl('https://shop.tiktok.com/us/pdp/elegant-summer-dress/1732387101164802835?x=1')).toMatchObject({ kind: 'product', productId: '1732387101164802835' });
    expect(parseShopUrl('https://www.tiktok.com/shop/pdp/honlink-set/1731753318135730868')).toMatchObject({ kind: 'product', productId: '1731753318135730868' });
    expect(parseShopUrl('https://instagram.com/foo')).toBeNull();
  });
});

describe('normalize', () => {
  it('turns store rows into a store and products', () => {
    const rows = load('store-rows.json');
    expect(normalizeStore(rows)).toMatchObject({ externalShopId: '8652615273314554588', shopName: 'flux hoodies', totalSold: 16872 });
    const products = normalizeProducts(rows);
    expect(products).toHaveLength(4);
    expect(products[0]).toMatchObject({ externalId: '1732187387400393436', priceCents: 3367, soldCount: 2225, currency: 'USD', category: 'set' });
    expect(products[0]!.imageUrls).toHaveLength(1); // same image on two CDN hosts
  });

  it('keeps 9 images, variants and specs from product details', () => {
    const [dress] = normalizeProducts(load('product-details.json'));
    expect(dress).toMatchObject({ category: 'dress', categoryPath: "Womenswear & Underwear > Women's Dresses > Casual Dresses", soldCount: 2905 });
    expect(dress!.imageUrls.length).toBeGreaterThan(3);
    expect(dress!.variants?.[0]).toMatchObject({ color: 'Apricot', size: 'L', priceCents: 2593 });
    expect(dress!.specifications?.Composition).toContain('Polyester');
  });

  it('maps categories, splits variants and only offers colorways that have images', () => {
    expect(mapCategory("Women's Two-Piece Set, Sweatshirt & Wide Leg Pants", null)).toBe('set');
    expect(mapCategory('Tan leather shoulder bag', null)).toBe('bag');
    expect(mapCategory('Anything', 'Womenswear > Skirts > Mini Skirts')).toBe('skirt');
    expect(splitVariantName('olive green, XL')).toEqual({ color: 'olive green', size: 'XL' });
    expect(splitVariantName('M')).toEqual({ color: null, size: 'M' });
    expect(splitVariantName('Black')).toEqual({ color: 'Black', size: null });
    expect(dedupeImages(['https://p16-a.com/x/1.webp?a=1', 'https://p19-a.com/x/1.webp?a=2', 'https://p16-a.com/x/2.webp'])).toHaveLength(2);
    expect(colorwaysWithImages([{ id: '1', name: 'Red, S', color: 'Red', size: 'S', priceCents: 1, stock: 1, imageUrl: 'https://i/red.jpg' }, { id: '2', name: 'Blue, S', color: 'Blue', size: 'S', priceCents: 1, stock: 1, imageUrl: null }])).toEqual([{ color: 'Red', imageUrl: 'https://i/red.jpg' }]);
  });
});

describe('import cap', () => {
  it('never pulls more than NEXT5_SHOP_IMPORT_MAX (default 10) products', async () => {
    const { importCapFor } = await import('../../../src/server/shopImport/service');
    const prev = process.env.NEXT5_SHOP_IMPORT_MAX;
    delete process.env.NEXT5_SHOP_IMPORT_MAX;
    expect(importCapFor('shop_pro')).toBe(10);
    process.env.NEXT5_SHOP_IMPORT_MAX = '500';
    expect(importCapFor('shop_pro')).toBe(500);
    expect(importCapFor(null)).toBe(50);
    process.env.NEXT5_SHOP_IMPORT_MAX = prev;
  });
});
