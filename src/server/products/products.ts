// server-only — never import from a 'use client' file.

import type { Product, Workspace } from '@prisma/client';
import { isProductCategory } from '../../config/shots';
import { prisma } from '../../lib/db';
import type { ProductDto } from '../../types/business/products';
import { HttpError } from '../http';
import { normalizeUpload } from '../storage/images';
import { productKey, type ProductPhotoSide } from '../storage/keys';
import { presignObject, putObject } from '../storage/objectStore';

export type ProductFields = { name: string; category: string; colorName: string | null; sku: string | null; fit: string | null; notes: string | null };

const FITS = ['fitted', 'regular', 'oversized'];

export const parseProductFields = (raw: Record<string, unknown>, label = 'product'): ProductFields => {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = str(raw.name, 80);
  const category = str(raw.category, 20);
  if (!name) throw new HttpError(400, 'name_required', `Add a name for the ${label}.`, { field: 'name' });
  if (!isProductCategory(category)) throw new HttpError(400, 'category_required', `Choose a category for the ${label}.`, { field: 'category' });
  const fit = str(raw.fit, 20);
  return { name, category, colorName: str(raw.colorName, 40) || null, sku: str(raw.sku, 40) || null, fit: FITS.includes(fit) ? fit : null, notes: str(raw.notes, 120) || null };
};

/** Creates a product with its photos (front required). Photos are normalized before storage. */
export const createProduct = async (
  workspace: Workspace,
  fields: ProductFields,
  photos: { front: File; back?: File | null; detail?: File | null },
): Promise<Product> => {
  if (workspace.product !== 'shop') throw new HttpError(400, 'wrong_product', 'Products are for Shop Studio.');
  const front = await normalizeUpload(photos.front, 'front photo');
  const back = photos.back ? await normalizeUpload(photos.back, 'back photo') : null;
  const detail = photos.detail ? await normalizeUpload(photos.detail, 'detail photo') : null;

  const product = await prisma.product.create({ data: { workspaceId: workspace.id, ...fields, frontR2Key: 'pending' } });
  const store = async (side: ProductPhotoSide, buffer: Buffer | null) => {
    if (!buffer) return null;
    const key = productKey(workspace.id, product.id, side);
    await putObject(key, buffer);
    return key;
  };
  const [frontKey, backKey, detailKey] = await Promise.all([store('front', front), store('back', back), store('detail', detail)]);
  return prisma.product.update({ where: { id: product.id }, data: { frontR2Key: frontKey ?? '', backR2Key: backKey, detailR2Key: detailKey } });
};

type VariantJson = { color?: string | null }[];

export const toProductDto = async (product: Product & { _count?: { items: number }; snapshots?: { soldCount: number | null }[] }): Promise<ProductDto> => {
  const variants = Array.isArray(product.variants) ? (product.variants as VariantJson) : [];
  const baseline = product.snapshots?.[0]?.soldCount;
  return {
  source: product.source,
  externalUrl: product.externalUrl,
  priceCents: product.priceCents,
  currency: product.currency,
  soldCount: product.soldCount,
  soldSinceImport: baseline != null && product.soldCount != null ? Math.max(0, product.soldCount - baseline) : null,
  imageUrls: product.imageUrls,
  frontImageUrl: product.frontImageUrl,
  photoPending: !product.frontR2Key || product.frontR2Key === 'pending',
  variantCount: variants.length,
  colors: [...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))],
  detailsFetched: Boolean(product.detailsFetchedAt),
  id: product.id, name: product.name, category: product.category, colorName: product.colorName, sku: product.sku, fit: product.fit, notes: product.notes,
  frontUrl: product.frontR2Key && product.frontR2Key !== 'pending' ? await presignObject(product.frontR2Key) : null,
  backUrl: product.backR2Key ? await presignObject(product.backR2Key) : null,
  detailUrl: product.detailR2Key ? await presignObject(product.detailR2Key) : null,
  archived: Boolean(product.archivedAt),
  timesUsed: product._count?.items ?? 0,
  lastUsedAt: product.lastUsedAt?.toISOString() ?? null,
  createdAt: product.createdAt.toISOString(),
  };
};

/**
 * Archives or brings back products the seller picked. Archived products stay out of drops, the store page
 * and weekly syncs; photos already created stay in the library.
 */
export const setProductsArchived = async (workspaceId: string, productIds: readonly string[], archived: boolean, now = new Date()): Promise<number> => {
  const { count } = await prisma.product.updateMany({
    where: { workspaceId, id: { in: [...productIds] } },
    data: { archivedAt: archived ? now : null, archivedBySeller: archived },
  });
  return count;
};
