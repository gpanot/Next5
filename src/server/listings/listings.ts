// server-only — never import from a 'use client' file.
// Listings: a property she represents, and the photos of it we may place her into.
// The rule this file exists to enforce: we never invent a room.
// Plan: docs/business-studios/12-listing-mode-plan.md.

import type { Listing, PostMaterial, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { materialKey } from '../storage/keys';
import { deleteObject, presignObject, putObject } from '../storage/objectStore';

/** Looks she can get from one room photo. More than this and the poses start repeating. */
export const MIN_VARIATIONS = 1;
export const MAX_VARIATIONS = 3;
export const DEFAULT_VARIATIONS = 2;
export const MAX_ROOMS_PER_LISTING = 20;

export type ListingWithMaterials = Listing & { materials: PostMaterial[] };

const brandOnly = (ws: Workspace): void => {
  if (ws.product !== 'brand') throw new HttpError(400, 'wrong_product', 'Listings are part of Brand Studio.');
};

export const clampVariations = (value: unknown): number => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_VARIATIONS;
  return Math.min(MAX_VARIATIONS, Math.max(MIN_VARIATIONS, n));
};

export const listListings = async (workspaceId: string): Promise<ListingWithMaterials[]> =>
  prisma.listing.findMany({
    where: { workspaceId, archivedAt: null },
    include: { materials: { where: { archivedAt: null }, orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

export const getListing = async (workspaceId: string, listingId: string): Promise<ListingWithMaterials> => {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, workspaceId, archivedAt: null },
    include: { materials: { where: { archivedAt: null }, orderBy: { createdAt: 'asc' } } },
  });
  if (!listing) throw new HttpError(404, 'listing_not_found', 'That property is no longer in your list.');
  return listing;
};

/**
 * Creating a listing requires her to confirm she represents the property —
 * the same attestation shape Shop uses for a store.
 */
export const createListing = async (
  ws: Workspace,
  input: { label: string; attest: boolean; visibleAiTag: boolean },
): Promise<Listing> => {
  brandOnly(ws);
  const label = input.label.trim().slice(0, 120);
  if (!label) throw new HttpError(400, 'invalid_label', 'Give the property a name, like the street address.');
  if (!input.attest) throw new HttpError(400, 'attest_required', 'Confirm you represent this property.');
  return prisma.listing.create({ data: { workspaceId: ws.id, label, visibleAiTag: input.visibleAiTag } });
};

export const updateListing = async (
  workspaceId: string,
  listingId: string,
  input: { label?: string; visibleAiTag?: boolean },
): Promise<Listing> => {
  await getListing(workspaceId, listingId);
  const label = input.label?.trim().slice(0, 120);
  return prisma.listing.update({
    where: { id: listingId },
    data: { ...(label ? { label } : {}), ...(input.visibleAiTag === undefined ? {} : { visibleAiTag: input.visibleAiTag }) },
  });
};

export const archiveListing = async (workspaceId: string, listingId: string): Promise<void> => {
  await getListing(workspaceId, listingId);
  await prisma.listing.update({ where: { id: listingId }, data: { archivedAt: new Date() } });
};

/** Adds one room photo. The row is created first so the key comes from a server id. */
export const addRoom = async (
  ws: Workspace,
  listingId: string,
  image: Buffer,
  label: string | null,
): Promise<PostMaterial> => {
  const listing = await getListing(ws.id, listingId);
  const count = await prisma.postMaterial.count({ where: { listingId: listing.id, archivedAt: null } });
  if (count >= MAX_ROOMS_PER_LISTING) {
    throw new HttpError(400, 'too_many_rooms', `A property can hold up to ${MAX_ROOMS_PER_LISTING} photos.`);
  }
  const material = await prisma.postMaterial.create({
    data: { workspaceId: ws.id, listingId: listing.id, r2Key: 'pending', kind: 'listing', label: label?.slice(0, 120) || null },
  });
  const key = materialKey(ws.id, material.id);
  await putObject(key, image);
  return prisma.postMaterial.update({ where: { id: material.id }, data: { r2Key: key } });
};

export const removeRoom = async (workspaceId: string, materialId: string): Promise<void> => {
  const material = await prisma.postMaterial.findFirst({ where: { id: materialId, workspaceId, archivedAt: null } });
  if (!material) throw new HttpError(404, 'room_not_found', 'That photo is no longer on this property.');
  await prisma.postMaterial.update({ where: { id: material.id }, data: { archivedAt: new Date() } });
  if (material.r2Key !== 'pending') await deleteObject(material.r2Key).catch(() => undefined);
};

/** Room photos ready to be used — anything still uploading is not. */
export const roomsFor = (listing: ListingWithMaterials): PostMaterial[] =>
  listing.materials.filter((m) => m.r2Key !== 'pending');

export const toListingDto = async (listing: ListingWithMaterials) => ({
  id: listing.id,
  label: listing.label,
  visibleAiTag: listing.visibleAiTag,
  createdAt: listing.createdAt.toISOString(),
  rooms: await Promise.all(
    roomsFor(listing).map(async (m) => ({
      id: m.id,
      label: m.label,
      url: await presignObject(m.r2Key),
      used: m.usedAt !== null,
    })),
  ),
});
