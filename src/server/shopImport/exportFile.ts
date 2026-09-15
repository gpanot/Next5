// Pure: a TikTok Seller Center product export (xlsx/csv rows) → products.
// Columns are detected by name because templates change; verify against the first real seller file (spike P15.0).

import { createHash } from 'node:crypto';
import { dedupeImages, mapCategory, type NormalizedProduct } from './normalize';

type Cell = string | number | boolean | Date | null | undefined;

const norm = (h: Cell): string => String(h ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const FIELDS = {
  id: [/^product id$/, /^product_id$/, /^item id$/, /^id$/],
  title: [/^product name$/, /^product title$/, /^title$/, /^name$/],
  sku: [/^seller sku$/, /^sku$/, /^sku id$/],
  price: [/^price$/, /^retail price/, /^sku price/, /^selling price/, /^original price/],
  category: [/^category/],
  description: [/^product description$/, /^description$/],
  sold: [/sold/, /^sales$/],
  url: [/product link/, /product url/, /^url$/],
} as const;

export type ExportParseResult = { products: NormalizedProduct[]; headers: string[]; missing: string[] };

/** Finds the header row (first row with a title-like and an image-like column) and maps rows to products. */
export const parseExportRows = (rows: Cell[][]): ExportParseResult => {
  const headerIndex = rows.slice(0, 10).findIndex((r) => r.some((c) => FIELDS.title.some((re) => re.test(norm(c)))) && r.some((c) => /image|photo|picture/.test(norm(c))));
  const headerRow = headerIndex >= 0 ? rows[headerIndex]! : rows[0] ?? [];
  const headers = headerRow.map(norm);
  const col = (patterns: readonly RegExp[]) => headers.findIndex((h) => patterns.some((re) => re.test(h)));
  const idx = { id: col(FIELDS.id), title: col(FIELDS.title), sku: col(FIELDS.sku), price: col(FIELDS.price), category: col(FIELDS.category), description: col(FIELDS.description), sold: col(FIELDS.sold), url: col(FIELDS.url) };
  const imageCols = headers.map((h, i) => (/image|photo|picture/.test(h) && !/size chart/.test(h) ? i : -1)).filter((i) => i >= 0);
  const missing = [idx.title < 0 ? 'product name' : null, imageCols.length === 0 ? 'image URL' : null].filter((m): m is string => Boolean(m));
  if (missing.length) return { products: [], headers, missing };

  const byId = new Map<string, NormalizedProduct>();
  for (const row of rows.slice(Math.max(headerIndex, 0) + 1)) {
    const title = String(row[idx.title] ?? '').trim();
    if (!title) continue;
    const imageUrls = dedupeImages(imageCols.flatMap((i) => String(row[i] ?? '').split(/[\s,;|]+/)));
    const externalId = (idx.id >= 0 && String(row[idx.id] ?? '').trim()) || (idx.sku >= 0 && String(row[idx.sku] ?? '').trim()) || createHash('sha1').update(title).digest('hex').slice(0, 16);
    const existing = byId.get(externalId);
    if (existing) {
      existing.imageUrls = dedupeImages([...existing.imageUrls, ...imageUrls]); // SKU rows repeat the product
      continue;
    }
    const categoryPath = idx.category >= 0 ? String(row[idx.category] ?? '') || null : null;
    const price = idx.price >= 0 ? Number.parseFloat(String(row[idx.price] ?? '').replace(/[^0-9.]/g, '')) : Number.NaN;
    const sold = idx.sold >= 0 ? Number.parseInt(String(row[idx.sold] ?? '').replace(/[^0-9]/g, ''), 10) : Number.NaN;
    byId.set(externalId, {
      externalId,
      title: title.slice(0, 200),
      externalUrl: idx.url >= 0 ? String(row[idx.url] ?? '') || null : null,
      imageUrls,
      priceCents: Number.isFinite(price) && price > 0 ? Math.round(price * 100) : null,
      currency: 'USD',
      soldCount: Number.isFinite(sold) ? sold : null,
      category: mapCategory(title, categoryPath),
      categoryPath,
      description: idx.description >= 0 ? String(row[idx.description] ?? '').slice(0, 2000) || null : null,
      variants: null,
      specifications: null,
    });
  }
  return { products: [...byId.values()].filter((p) => p.imageUrls.length > 0), headers, missing: [] };
};

/** Minimal RFC 4180 CSV reader (quoted fields, escaped quotes, CRLF). */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
};
