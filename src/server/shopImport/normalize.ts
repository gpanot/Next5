// Pure: TikTok Shop catalog rows → Next5 products. No I/O, so it is fully unit-tested with real fixtures.

import type { ProductCategory } from '../../config/shots';

export type ShopUrl = { kind: 'store'; url: string; sellerId: string; slug: string } | { kind: 'product'; url: string; productId: string };

export type NormalizedVariant = { id: string; name: string; color: string | null; size: string | null; priceCents: number | null; stock: number | null; imageUrl: string | null };

export type NormalizedProduct = {
  externalId: string;
  title: string;
  externalUrl: string | null;
  imageUrls: string[];
  priceCents: number | null;
  currency: string | null;
  soldCount: number | null;
  category: ProductCategory;
  categoryPath: string | null;
  description: string | null;
  variants: NormalizedVariant[] | null;
  specifications: Record<string, string> | null;
};

export type NormalizedStore = { externalShopId: string | null; shopName: string | null; shopUrl: string | null; logoUrl: string | null; totalSold: number | null };

const STORE_RE = /^https?:\/\/(?:shop\.tiktok\.com\/(?:[a-z]{2}\/)?store|(?:www\.)?tiktok\.com\/shop\/store)\/([^/?#]+)\/(\d{6,})/i;
const PRODUCT_RE = /^https?:\/\/(?:shop\.tiktok\.com\/(?:[a-z]{2}\/)?(?:pdp|view\/product)|(?:www\.)?tiktok\.com\/shop\/pdp)\/(?:[^/?#]+\/)?(\d{6,})/i;

/** Accepts a store URL or a product URL (whose store is looked up later). */
export const parseShopUrl = (input: string): ShopUrl | null => {
  const url = input.trim();
  const store = url.match(STORE_RE);
  if (store) return { kind: 'store', url: `https://shop.tiktok.com/us/store/${store[1]}/${store[2]}`, slug: store[1]!, sellerId: store[2]! };
  const product = url.match(PRODUCT_RE);
  if (product) return { kind: 'product', url: url.split(/[?#]/)[0]!, productId: product[1]! };
  return null;
};

const toCents = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

const toInt = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

/** Same image is often listed twice on two CDN hosts (p16/p19): keep the first of each file. */
export const dedupeImages = (urls: unknown): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of Array.isArray(urls) ? urls : []) {
    if (typeof u !== 'string' || !/^https?:\/\//.test(u)) continue;
    const file = u.split('?')[0]!.replace(/^https?:\/\/[^/]+/, '');
    if (seen.has(file)) continue;
    seen.add(file);
    out.push(u);
  }
  return out.slice(0, 9);
};

const CATEGORY_RULES: [RegExp, ProductCategory][] = [
  [/\b(swim|bikini|one-piece swimsuit|swimsuit)/i, 'swim'],
  [/\b(two[- ]piece|2[- ]piece|matching set|co-?ord|tracksuit|\bset\b|outfit)/i, 'set'],
  [/\b(dress|gown)/i, 'dress'],
  [/\bskirt/i, 'skirt'],
  [/\b(pants|jeans|trousers|leggings|shorts|joggers)/i, 'pants'],
  [/\b(jacket|coat|blazer|cardigan|puffer|trench)/i, 'outerwear'],
  [/\b(bag|purse|tote|handbag|backpack|wallet)/i, 'bag'],
  [/\b(shoe|sneaker|heel|sandal|boot|loafer|slipper)/i, 'shoes'],
  [/\b(necklace|earring|bracelet|ring\b|jewel)/i, 'jewelry'],
  [/\b(hat|cap\b|scarf|belt|sunglasses|hair clip)/i, 'accessory'],
];

/** Best-effort category from the TikTok category path, then the title. Defaults to top. */
export const mapCategory = (title: string, categoryPath: string | null): ProductCategory => {
  const leaf = categoryPath?.split('>').slice(-2).join(' ') ?? '';
  for (const text of [leaf, title]) {
    for (const [re, category] of CATEGORY_RULES) if (re.test(text)) return category;
  }
  return 'top';
};

const SIZE_RE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|one size|os|free size|\d{1,2}(\.\d)?|\d{2}\s?(w|in)?)$/i;

/** "Apricot, L" → color Apricot, size L. A lone token is a size when it looks like one. */
export const splitVariantName = (name: string): { color: string | null; size: string | null } => {
  const parts = name.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { color: parts.slice(0, -1).join(', '), size: parts[parts.length - 1]! };
  const only = parts[0] ?? '';
  return SIZE_RE.test(only) ? { color: null, size: only } : { color: only || null, size: null };
};

type Row = Record<string, unknown>;

export const normalizeStore = (rows: Row[]): NormalizedStore | null => {
  const store = rows.find((r) => r.type === 'store');
  if (!store) return null;
  return {
    externalShopId: store.sellerId ? String(store.sellerId) : null,
    shopName: store.shopName ? String(store.shopName) : null,
    shopUrl: store.shopUrl ? String(store.shopUrl) : null,
    logoUrl: store.shopLogo ? String(store.shopLogo) : null,
    totalSold: toInt(store.soldCount),
  };
};

/** Store list rows or full product rows → products (deduped by id). */
export const normalizeProducts = (rows: Row[]): NormalizedProduct[] => {
  const byId = new Map<string, NormalizedProduct>();
  for (const r of rows) {
    if (r.type !== 'store_product' && r.type !== 'product' && r.type !== 'product_card') continue;
    const externalId = String(r.productId ?? '');
    const title = String(r.title ?? '').trim();
    if (!externalId || !title) continue;
    const categoryPath = r.category ? String(r.category) : null;
    const variants = Array.isArray(r.variants)
      ? (r.variants as Row[]).map((v) => ({ id: String(v.variantId ?? ''), name: String(v.name ?? ''), ...splitVariantName(String(v.name ?? '')), priceCents: toCents(v.price), stock: toInt(v.stockQuantity), imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : null }))
      : null;
    byId.set(externalId, {
      externalId,
      title: title.slice(0, 200),
      externalUrl: r.productUrl ? String(r.productUrl) : null,
      imageUrls: dedupeImages(r.imageUrls),
      priceCents: toCents(r.currentPrice),
      currency: r.currency ? String(r.currency) : null,
      // Store rows only have salesVolume; detail rows also have exactSoldCount (all regions). Use one metric so before/after stays honest.
      soldCount: toInt(r.salesVolume ?? r.exactSoldCount),
      category: mapCategory(title, categoryPath),
      categoryPath,
      description: r.description ? String(r.description).slice(0, 2000) : null,
      variants,
      specifications: r.specifications && typeof r.specifications === 'object' ? (r.specifications as Record<string, string>) : null,
    });
  }
  return [...byId.values()];
};

/** Distinct colorways with their own image — the only ones V1 generates (see spike finding 3). */
export const colorwaysWithImages = (variants: NormalizedVariant[] | null): { color: string; imageUrl: string }[] => {
  const out = new Map<string, string>();
  for (const v of variants ?? []) if (v.color && v.imageUrl && !out.has(v.color)) out.set(v.color, v.imageUrl);
  return [...out].map(([color, imageUrl]) => ({ color, imageUrl }));
};
