// server-only — never import from a 'use client' file.

import type { BatchItem, Product, Workspace } from '@prisma/client';
import type { PostKitDto } from '../../types/business/batches';
import type { ListingPackDto, ListingPackSummaryDto, PackPhotoDto, PackStatusDto } from '../../types/business/shop';
import { presignObject } from '../storage/objectStore';
import type { resolvePack } from './listingPacks';

type Pack = ReturnType<typeof resolvePack>;

const photo = async (item: BatchItem): Promise<PackPhotoDto> => ({ itemId: item.id, url: item.r2Key ? await presignObject(item.r2Key) : null, format: item.format, shot: item.shot, score: item.score });
const original = async (p: Product) => (p.frontR2Key && p.frontR2Key !== 'pending' ? presignObject(p.frontR2Key) : p.frontImageUrl ?? p.imageUrls[0] ?? null);

export const toPackSummaryDto = async (p: { product: Product; items: BatchItem[]; pack: Pack; status: PackStatusDto }): Promise<ListingPackSummaryDto> => {
  const main = p.items.find((i) => i.id === p.pack.slots[0]);
  return {
    productId: p.product.id, name: p.product.name, sku: p.product.sku, originalUrl: await original(p.product),
    mainUrl: main?.r2Key ? await presignObject(main.r2Key) : null, photoCount: p.pack.slots.length, hasCover: Boolean(p.pack.coverItemId), status: p.status, warnings: p.pack.warnings,
  };
};

export const toPackDto = async (ws: Workspace, p: { product: Product & { listingPack: { hiddenItemIds: string[] } | null }; items: BatchItem[]; pack: Pack; status: PackStatusDto }): Promise<ListingPackDto> => {
  const byId = new Map(p.items.map((i) => [i.id, i]));
  const pick = (ids: string[]) => Promise.all(ids.map((id) => byId.get(id)).filter((i): i is BatchItem => Boolean(i)).map(photo));
  const hidden = p.product.listingPack?.hiddenItemIds ?? [];
  const main = byId.get(p.pack.slots[0] ?? '');
  const kit = (main?.postKit as PostKitDto | null) ?? null;
  return {
    productId: p.product.id, name: p.product.name, sku: p.product.sku, externalUrl: p.product.externalUrl, originalUrl: await original(p.product), status: p.status,
    slots: await pick(p.pack.slots),
    extra: await pick([...p.pack.extra, ...hidden.filter((id) => byId.has(id) && byId.get(id)!.format !== 'story_9_16')]),
    covers: await Promise.all(p.items.filter((i) => i.format === 'story_9_16').map(photo)),
    coverItemId: p.pack.coverItemId, hiddenItemIds: hidden, warnings: p.pack.warnings, visibleAiTag: ws.visibleAiTag,
    description: kit?.description ?? p.product.description, mainItemId: main?.id ?? null,
  };
};
