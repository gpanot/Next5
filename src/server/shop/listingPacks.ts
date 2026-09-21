// server-only — never import from a 'use client' file.
// TikTok Shop listing packs: up to 9 photos in upload order (slot 1 = main image) + one 9:16 video cover.

import type { BatchItem, ListingPack, Product, Workspace } from '@prisma/client';
import JSZip from 'jszip';
import { prisma } from '../../lib/db';
import type { PostKitDto } from '../../types/business/batches';
import { HttpError } from '../http';
import { getObject } from '../storage/objectStore';

export const MAX_SLOTS = 9;
export type PackStatus = 'draft' | 'ready' | 'uploaded';
export const isPackStatus = (v: unknown): v is PackStatus => v === 'draft' || v === 'ready' || v === 'uploaded';

type PackItem = Pick<BatchItem, 'id' | 'format' | 'shot' | 'completedAt'>;

const SHOT_RANK = ['full_body_front', 'full_body_styled', 'half_body', 'walking_motion', 'side_profile', 'back_or_side', 'seated_pose', 'worn_half_body', 'lifestyle_candid', 'lifestyle_in_hand_or_on_foot', 'detail_closeup'];
const FORMAT_RANK = ['square_1_1', 'portrait_3_4', 'portrait_4_5'];
const rank = (list: readonly string[], value: string | null) => {
  const i = list.indexOf(value ?? '');
  return i < 0 ? list.length : i;
};

/**
 * Resolves the pack from ready photos and the seller's saved choices (pure):
 * saved order first (still-ready photos only), then new photos by format (square first) and shot,
 * never the hidden ones. The cover is the saved 9:16 photo, else the newest 9:16.
 */
export const resolvePack = (items: readonly PackItem[], saved: Pick<ListingPack, 'slotItemIds' | 'hiddenItemIds' | 'coverItemId'> | null) => {
  const stills = items.filter((i) => i.format !== 'story_9_16');
  const covers = items.filter((i) => i.format === 'story_9_16').sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
  const byId = new Map(stills.map((i) => [i.id, i]));
  const hidden = new Set(saved?.hiddenItemIds ?? []);
  const ordered = (saved?.slotItemIds ?? []).filter((id) => byId.has(id) && !hidden.has(id));
  const rest = stills
    .filter((i) => !ordered.includes(i.id) && !hidden.has(i.id))
    .sort((a, b) => rank(FORMAT_RANK, a.format) - rank(FORMAT_RANK, b.format) || rank(SHOT_RANK, a.shot) - rank(SHOT_RANK, b.shot) || (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));
  const slots = [...ordered, ...rest.map((i) => i.id)].slice(0, MAX_SLOTS);
  const extra = stills.filter((i) => !slots.includes(i.id)).map((i) => i.id);
  const coverItemId = saved?.coverItemId && covers.some((c) => c.id === saved.coverItemId) ? saved.coverItemId : covers[0]?.id ?? null;
  const warnings: string[] = [];
  const main = slots[0] ? byId.get(slots[0]) : null;
  if (main && main.format !== 'square_1_1') warnings.push('TikTok Shop recommends a square (1:1) main image. Make square photos, or move one to slot 1.');
  if (!coverItemId) warnings.push('No 9:16 video cover yet. Create one in the cover section.');
  return { slots, extra, coverItemId, warnings };
};

const readyItems = (workspaceId: string, productId: string) =>
  prisma.batchItem.findMany({ where: { productId, status: 'ready', r2Key: { not: null }, batch: { workspaceId, preview: false } }, orderBy: { completedAt: 'asc' } });

const ownedProduct = async (ws: Workspace, productId: string): Promise<Product & { listingPack: ListingPack | null }> => {
  if (ws.product !== 'shop') throw new HttpError(400, 'wrong_product', 'Listing packs are part of Shop Studio.');
  const product = await prisma.product.findFirst({ where: { id: productId, workspaceId: ws.id }, include: { listingPack: true } });
  if (!product) throw new HttpError(404, 'product_not_found', 'Product not found.');
  return product;
};

/** Products that have ready photos, with their pack summary (newest photos first). */
export const listPacks = async (ws: Workspace) => {
  const groups = await prisma.batchItem.groupBy({ by: ['productId'], where: { status: 'ready', r2Key: { not: null }, productId: { not: null }, batch: { workspaceId: ws.id } }, _count: { _all: true }, _max: { completedAt: true } });
  const ids = groups.map((g) => g.productId!).filter(Boolean);
  const products = await prisma.product.findMany({ where: { id: { in: ids }, workspaceId: ws.id }, include: { listingPack: true } });
  const out = await Promise.all(products.map(async (product) => {
    const items = await readyItems(ws.id, product.id);
    const pack = resolvePack(items, product.listingPack);
    const group = groups.find((g) => g.productId === product.id);
    return { product, items, pack, status: (product.listingPack?.status ?? 'draft') as PackStatus, lastPhotoAt: group?._max.completedAt ?? null };
  }));
  return out.sort((a, b) => (b.lastPhotoAt?.getTime() ?? 0) - (a.lastPhotoAt?.getTime() ?? 0));
};

export const getPack = async (ws: Workspace, productId: string) => {
  const product = await ownedProduct(ws, productId);
  const items = await readyItems(ws.id, product.id);
  return { product, items, pack: resolvePack(items, product.listingPack), status: (product.listingPack?.status ?? 'draft') as PackStatus };
};

export type PackUpdate = { slotItemIds?: string[]; hiddenItemIds?: string[]; coverItemId?: string | null; status?: PackStatus };

/** Saves the seller's order, hidden photos, cover and status. Unknown photo ids are rejected. */
export const savePack = async (ws: Workspace, productId: string, update: PackUpdate): Promise<void> => {
  const product = await ownedProduct(ws, productId);
  const items = await readyItems(ws.id, product.id);
  const valid = new Set(items.map((i) => i.id));
  const check = (ids: string[] | undefined) => {
    if (ids && ids.some((id) => !valid.has(id))) throw new HttpError(400, 'unknown_photo', 'That photo is not part of this product.');
  };
  check(update.slotItemIds);
  check(update.hiddenItemIds);
  if (update.slotItemIds && update.slotItemIds.length > MAX_SLOTS) throw new HttpError(400, 'too_many_photos', 'TikTok Shop allows up to 9 photos.');
  if (update.coverItemId && !items.some((i) => i.id === update.coverItemId && i.format === 'story_9_16')) throw new HttpError(400, 'invalid_cover', 'The cover must be a 9:16 photo of this product.');
  const data = {
    ...(update.slotItemIds ? { slotItemIds: update.slotItemIds } : {}),
    ...(update.hiddenItemIds ? { hiddenItemIds: update.hiddenItemIds } : {}),
    ...(update.coverItemId !== undefined ? { coverItemId: update.coverItemId } : {}),
    ...(update.status ? { status: update.status, uploadedAt: update.status === 'uploaded' ? new Date() : null } : {}),
  };
  await prisma.listingPack.upsert({ where: { productId: product.id }, update: data, create: { workspaceId: ws.id, productId: product.id, ...data } });
};

const slugify = (v: string) => v.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').toLowerCase().slice(0, 40) || 'product';

/** File names in TikTok upload order: {sku}_01_main.jpg, {sku}_02.jpg … {sku}_cover_9x16.jpg (pure). */
export const packFileNames = (label: string, slotCount: number, hasCover: boolean): { slots: string[]; cover: string | null } => {
  const base = slugify(label);
  const slots = Array.from({ length: slotCount }, (_, i) => `${base}_${String(i + 1).padStart(2, '0')}${i === 0 ? '_main' : ''}.jpg`);
  return { slots, cover: hasCover ? `${base}_cover_9x16.jpg` : null };
};

/** Zip of the listing pack plus a description.txt (Post Kit when written, else the imported description). */
export const zipPack = async (ws: Workspace, productId: string): Promise<{ buffer: Buffer; name: string }> => {
  const { product, items, pack } = await getPack(ws, productId);
  if (pack.slots.length === 0) throw new HttpError(404, 'nothing_ready', 'This product has no photos yet.');
  const label = product.sku?.trim() || product.name;
  const names = packFileNames(label, pack.slots.length, Boolean(pack.coverItemId));
  const byId = new Map(items.map((i) => [i.id, i]));
  const zip = new JSZip();
  await Promise.all(pack.slots.map(async (id, i) => {
    const key = byId.get(id)?.r2Key;
    const body = key ? await getObject(key) : null;
    if (body) zip.file(names.slots[i]!, body);
  }));
  if (pack.coverItemId && names.cover) {
    const key = byId.get(pack.coverItemId)?.r2Key;
    const body = key ? await getObject(key) : null;
    if (body) zip.file(names.cover, body);
  }
  // The listing Post Kit (whole series) wins over an older per-photo kit.
  const kit = (product.postKit as PostKitDto | null) ?? (byId.get(pack.slots[0]!)?.postKit as PostKitDto | null) ?? null;
  const text = [product.name, '', kit?.hook ?? '', kit?.description ?? product.description ?? '', '', kit?.hashtags.join(' ') ?? '', '', 'Photos are AI-generated. Turn on the AI-generated label when you list them on TikTok Shop.'].join('\n').replace(/\n{3,}/g, '\n\n').trim();
  zip.file('description.txt', `${text}\n`);
  return { buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' }), name: `${slugify(label)}-tiktok-listing.zip` };
};
