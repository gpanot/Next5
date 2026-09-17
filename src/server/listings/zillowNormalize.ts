// server-only — never import from a 'use client' file.
// Zillow detail rows → our listing fields. Pure: no I/O.

import type { ApifyRow } from '../apify/client';
import type { ListingStatus } from '../../lib/listingPhotos';

export type ListingAddress = { street: string; city: string | null; state: string | null; zip: string | null; full: string };

export type ZillowCandidate = { id: string; url: string; thumbUrl: string; tag: string | null };

export type NormalizedZillowListing = {
  zpid: string;
  address: ListingAddress | null;
  priceCents: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: ListingStatus;
  daysOnMarket: number | null;
  candidates: ZillowCandidate[];
};

const JUST_LISTED_DAYS = 14;

const obj = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** Photo URLs look like …/fp/<32 hex>-<size suffix>.jpg; the hash is stable across syncs. */
const PHOTO_RE = /\/fp\/([0-9a-f]{16,})-[^/]+\.(jpe?g|webp)$/i;

export const thumbFor = (url: string): string => url.replace(/-[^-/]+\.(jpe?g|webp)$/i, '-cc_ft_384.jpg');

export const statusOf = (row: ApifyRow): ListingStatus => {
  const type = obj(row.listingType);
  const status = str(row.listingStatus)?.toLowerCase();
  if (status === 'sold') return 'sold';
  if (type.isComingSoon === true) return 'coming_soon';
  if (type.isPending === true || status === 'pending') return 'pending';
  if (type.isOpenHouse === true) return 'open_house';
  if (status === 'forsale') {
    const days = num(row.daysOnZillow);
    return days !== null && days <= JUST_LISTED_DAYS ? 'just_listed' : 'for_sale';
  }
  return 'off_market';
};

const addressOf = (row: ApifyRow): ListingAddress | null => {
  const a = obj(row.listingAddress);
  const street = str(a.street);
  if (!street) return null;
  const zip = str(a.zipCode);
  const city = str(a.city);
  const state = str(a.state);
  return { street, city, state, zip, full: str(a.full) ?? [street, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') };
};

const candidatesOf = (row: ApifyRow): ZillowCandidate[] => {
  const photos = Array.isArray(row.listingPhotos) ? row.listingPhotos : [];
  const seen = new Set<string>();
  const out: ZillowCandidate[] = [];
  for (const photo of photos) {
    const url = str(obj(photo).url);
    const id = url?.match(PHOTO_RE)?.[1];
    if (!url || !id || seen.has(id) || !url.startsWith('https://photos.zillowstatic.com/')) continue;
    seen.add(id);
    out.push({ id, url, thumbUrl: thumbFor(url), tag: null });
  }
  return out;
};

export const normalizeZillowRow = (row: ApifyRow | undefined): NormalizedZillowListing | null => {
  if (!row || row.zpid === undefined || row.zpid === null) return null;
  const price = num(obj(row.listingPrice).amount);
  return {
    zpid: String(row.zpid),
    address: addressOf(row),
    priceCents: price === null ? null : Math.round(price * 100),
    beds: num(row.bedrooms),
    baths: num(row.bathrooms),
    sqft: num(row.livingArea),
    status: statusOf(row),
    daysOnMarket: num(row.daysOnZillow),
    candidates: candidatesOf(row),
  };
};

/** "2720-Carolyn-Dr-SE-Smyrna-GA-30080" → "2720 Carolyn Dr SE Smyrna GA 30080", a name until the import lands. */
export const labelFromUrl = (url: string): string => {
  const slug = url.match(/homedetails\/([^/]+)\//)?.[1];
  return slug ? decodeURIComponent(slug).replace(/-/g, ' ').slice(0, 120) : 'Zillow listing';
};
