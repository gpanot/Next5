// server-only — never import from a 'use client' file.

import { isFormatId, type FormatId } from '../../config/formats';
import { isPackId, type PackId } from '../../config/shots';
import { HttpError } from '../http';

export const BRAND_COUNTS = [8, 16, 24, 32] as const;
export type BrandCount = (typeof BRAND_COUNTS)[number];

export type BrandDraft = {
  kind: 'brand_theme';
  setId: string;
  themeId: string;
  count: number;
  formats: FormatId[];
  highRes: boolean;
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
};

/** Built server-side only (onboarding trial, set preview) — never parsed from a request body. */
export type InternalBrandDraft = Omit<BrandDraft, 'kind'> & { kind: 'brand_theme'; trial?: boolean; sceneIds?: string[] };
export type InternalShopDraft = Omit<ShopDraft, 'kind'> & { kind: 'shop_products'; trial?: boolean };

export type BatchDraft = BrandDraft | ShopDraft;
export type AnyDraft = InternalBrandDraft | InternalShopDraft;

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
export const parseDraft = (body: Record<string, unknown>): BatchDraft => {
  const formats = parseFormats(body.formats);
  const highRes = body.highRes === true;

  if (body.kind === 'brand_theme') {
    const count = Number(body.count);
    if (!(BRAND_COUNTS as readonly number[]).includes(count)) throw bad('Choose 8, 16, 24 or 32 photos.');
    return { kind: 'brand_theme', setId: parseId(body.setId, 'set'), themeId: parseId(body.themeId, 'theme'), count, formats, highRes };
  }

  if (body.kind === 'shop_products') {
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) throw bad('Choose at least one product.');
    const productIds = [...new Set(body.productIds.map((id) => parseId(id, 'product')))];
    if (productIds.length > MAX_PRODUCTS_PER_BATCH) throw bad(`Choose up to ${MAX_PRODUCTS_PER_BATCH} products per batch.`);
    const packId = String(body.packId ?? '');
    if (!isPackId(packId)) throw bad('Choose a shot pack.');
    return { kind: 'shop_products', setId: parseId(body.setId, 'shop look'), productIds, packId, formats, highRes, more: body.more === true };
  }

  throw bad('Unknown batch type.');
};

export const creditsPerItem = (highRes: boolean): number => (highRes ? 2 : 1);
