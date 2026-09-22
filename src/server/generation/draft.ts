// server-only — never import from a 'use client' file.

import { isFormatId, type FormatId } from '../../config/formats';
import { isPackId, type PackId } from '../../config/shots';
import { POSE_ENERGIES, WARDROBES, type PoseEnergyId, type WardrobeId } from '../../content/business/catalog/types';
import { isOccasion, type Occasion } from '../../lib/listingOccasions';
import { HttpError } from '../http';

/** 1 is the try-it size: one photo, one credit, to see the look before spending a batch. */
export const BRAND_COUNTS = [1, 8, 16, 24, 32] as const;
export type BrandCount = (typeof BRAND_COUNTS)[number];

export type BrandDraft = {
  kind: 'brand_theme';
  setId: string;
  themeId: string;
  count: number;
  formats: FormatId[];
  highRes: boolean;
};

/**
 * Photos of her in one property's photos. No set and no theme: the room is the photo, the pose comes from
 * the room, the mood from the occasion (docs/business-studios/14-property-create-plan.md).
 */
export type BrandPropertyDraft = {
  kind: 'brand_property';
  listingId: string;
  occasion: Occasion;
  /** Looks per photo (1-3). */
  variations: number;
  /** Null: her latest set's look. */
  wardrobe: WardrobeId | null;
  poseEnergy: PoseEnergyId | null;
  formats: FormatId[];
  highRes: boolean;
  /** R2 key of an influencer portrait — overrides selfie lookup when present. */
  influencerKey?: string;
};

export type ShopDraft = {
  kind: 'shop_products';
  setId: string;
  productIds: string[];
  packId: PackId;
  formats: FormatId[];
  highRes: boolean;
  /** Instead of the pack: the next new angles for each product ("Create more photos"). */
  more?: boolean;
  /** Also make one 9:16 video cover per product (skipped when 9:16 is already a chosen format). */
  withCover?: boolean;
};

/** Built server-side only (onboarding trial, set preview) — never parsed from a request body. */
export type InternalBrandDraft = Omit<BrandDraft, 'kind'> & {
  kind: 'brand_theme';
  trial?: boolean;
  /** Free style preview. */
  preview?: boolean;
  sceneIds?: string[];
  /**
   * R2 key of an influencer base portrait to use as the identity reference instead of the user's
   * selfies. When set, `resolveBrandIdentity` skips the IdentityReference table entirely.
   */
  influencerKey?: string;
};
export type InternalShopDraft = Omit<ShopDraft, 'kind'> & { kind: 'shop_products'; trial?: boolean; /** Free look preview. */ preview?: boolean; /** Only the 9:16 cover per product (TikTok library). */ coverOnly?: boolean };

export type BatchDraft = BrandDraft | BrandPropertyDraft | ShopDraft;
export type AnyDraft = InternalBrandDraft | BrandPropertyDraft | InternalShopDraft;

export const MAX_PRODUCTS_PER_BATCH = 40;

const bad = (message: string): HttpError => new HttpError(400, 'invalid_batch', message);

const parseFormats = (value: unknown): FormatId[] => {
  if (!Array.isArray(value) || value.length === 0) throw bad('Choose at least one format.');
  const formats = [...new Set(value.map(String))];
  if (!formats.every(isFormatId)) throw bad('Unknown format.');
  return formats as FormatId[];
};

const parseId = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) throw bad(`Choose a ${label}.`);
  return value;
};

/** Validates a create-batch request body into a typed draft. Throws 400 with a readable message. */
const optionalId = <T extends string>(value: unknown, allowed: readonly { id: T }[]): T | null =>
  allowed.some((a) => a.id === value) ? (value as T) : null;

/** The count comes from her photos, not a picker, and the occasion is never assumed. */
const parsePropertyDraft = (body: Record<string, unknown>, formats: FormatId[], highRes: boolean, influencerKey?: string): BrandPropertyDraft => {
  if (!isOccasion(body.occasion)) throw bad('Pick what is happening with this home.');
  return {
    kind: 'brand_property',
    listingId: parseId(body.listingId, 'property'),
    occasion: body.occasion,
    variations: Number(body.variations ?? 2),
    wardrobe: optionalId(body.wardrobe, WARDROBES),
    poseEnergy: optionalId(body.poseEnergy, POSE_ENERGIES),
    formats,
    highRes,
    influencerKey,
  };
};

export const parseDraft = (body: Record<string, unknown>, influencerKey?: string): BatchDraft => {
  const formats = parseFormats(body.formats);
  const highRes = body.highRes === true;

  // A property batch. `brand_theme` with a listing is what an older open tab still sends.
  if (body.kind === 'brand_property' || (body.kind === 'brand_theme' && body.listingId)) {
    return parsePropertyDraft(body, formats, highRes, influencerKey);
  }

  if (body.kind === 'brand_theme') {
    const count = Number(body.count);
    if (!(BRAND_COUNTS as readonly number[]).includes(count)) throw bad('Choose 1, 8, 16, 24 or 32 photos.');
    return { kind: 'brand_theme', setId: parseId(body.setId, 'set'), themeId: parseId(body.themeId, 'theme'), count, formats, highRes, ...(influencerKey ? { influencerKey } : {}) };
  }

  if (body.kind === 'shop_products') {
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) throw bad('Choose at least one product.');
    const productIds = [...new Set(body.productIds.map((id) => parseId(id, 'product')))];
    if (productIds.length > MAX_PRODUCTS_PER_BATCH) throw bad(`Choose up to ${MAX_PRODUCTS_PER_BATCH} products per batch.`);
    const packId = String(body.packId ?? '');
    if (!isPackId(packId)) throw bad('Choose a shot pack.');
    return { kind: 'shop_products', setId: parseId(body.setId, 'shop look'), productIds, packId, formats, highRes, more: body.more === true, withCover: body.withCover === true };
  }

  throw bad('Unknown batch type.');
};

export const creditsPerItem = (highRes: boolean): number => (highRes ? 2 : 1);
