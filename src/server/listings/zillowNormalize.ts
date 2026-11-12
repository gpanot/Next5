// server-only — never import from a 'use client' file.
// Zillow detail rows → our listing fields. Pure: no I/O.

import type { ApifyRow } from '../apify/client';
import type { ListingStatus } from '../../lib/listingPhotos';

export type ListingAddress = { street: string; city: string | null; state: string | null; zip: string | null; full: string };

export type ZillowCandidate = { id: string; url: string; thumbUrl: string; tag: string | null };

export type PriceHistoryEntry = { date: string; event: string; price: number; priceChangeRate: number };

export type NormalizedZillowListing = {
  zpid: string;
  address: ListingAddress | null;
  priceCents: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: ListingStatus;
  daysOnMarket: number | null;
  /** ISO date string when the listing went on market (Apify field: onMarketDate). */
  onMarketDate: string | null;
  /** Listing description text (Apify field: description). */
  description: string | null;
  /** Full price history (Apify field: listingPriceHistory). */
  priceHistory: PriceHistoryEntry[] | null;
  /** True when listingType.isOpenHouse is true (Apify field). */
  isOpenHouse: boolean;
  /** Upcoming open houses from openHouseSchedule, local wall time "YYYY-MM-DDTHH:mm" (no zone: Zillow gives none). */
  openHouses: OpenHouseTime[];
  candidates: ZillowCandidate[];
  /** Story facts for the long (Auto) listing video. Null when the scrape does not carry them. */
  yearBuilt: number | null;
  lotSqft: number | null;
  homeType: string | null;
  neighborhood: string | null;
  /** Zillow's "What's special" chips, when present in the row. */
  highlights: string[];
};

export type OpenHouseTime = { start: string; end: string | null };

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

const priceHistoryOf = (row: ApifyRow): PriceHistoryEntry[] | null => {
  if (!Array.isArray(row.listingPriceHistory)) return null;
  const entries: PriceHistoryEntry[] = [];
  for (const item of row.listingPriceHistory) {
    const entry = obj(item);
    const date = str(entry.date);
    const event = str(entry.event);
    const price = num(entry.price);
    const rate = typeof entry.priceChangeRate === 'number' ? entry.priceChangeRate : 0;
    if (date && event && price !== null) entries.push({ date, event, price, priceChangeRate: rate });
  }
  return entries.length > 0 ? entries : null;
};

/** "2026-11-15 13:00:00", "2026-11-15T13:00" or epoch ms → "2026-11-15T13:00". */
const wallTime = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString().slice(0, 16);
  const m = typeof value === 'string' ? value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/) : null;
  return m ? `${m[1]}T${m[2]}` : null;
};

const openHousesOf = (row: ApifyRow): OpenHouseTime[] => {
  const list = Array.isArray(row.openHouseSchedule) ? row.openHouseSchedule : [];
  return list
    .map((item) => ({ start: wallTime(obj(item).startTime), end: wallTime(obj(item).endTime) }))
    .filter((t): t is OpenHouseTime => Boolean(t.start))
    .slice(0, 4);
};

const SQFT_PER_ACRE = 43_560;

/** Lot size: a plain sqft number, or a value + unit pair ("0.34", "Acres"). */
const lotOf = (row: ApifyRow): number | null => {
  const direct = num(row.lotSize) ?? num(obj(row.resoFacts).lotSize);
  if (direct !== null) return direct;
  const value = num(row.lotAreaValue) ?? num(obj(row.resoFacts).lotAreaValue);
  const unit = (str(row.lotAreaUnits) ?? str(obj(row.resoFacts).lotAreaUnits) ?? '').toLowerCase();
  if (value === null) return null;
  return unit.startsWith('acre') ? Math.round(value * SQFT_PER_ACRE) : value;
};

const HOME_TYPES: Record<string, string> = {
  SINGLE_FAMILY: 'Single family home', CONDO: 'Condo', TOWNHOUSE: 'Townhome', MULTI_FAMILY: 'Multi-family home', MANUFACTURED: 'Manufactured home', LOT: 'Lot',
};

/** "What's special" lives under different keys depending on the actor version; take the first list of strings. */
const highlightsOf = (row: ApifyRow): string[] => {
  for (const key of ['whatsSpecial', 'highlights', 'homeHighlights', 'keyFeatures']) {
    const v = (row as Record<string, unknown>)[key];
    const list = Array.isArray(v) ? v : Array.isArray(obj(v).tags) ? (obj(v).tags as unknown[]) : null;
    const strings = list?.map((x) => str(x) ?? str(obj(x).text) ?? str(obj(x).label)).filter((x): x is string => Boolean(x));
    if (strings?.length) return strings.slice(0, 10);
  }
  return [];
};

export const normalizeZillowRow = (row: ApifyRow | undefined): NormalizedZillowListing | null => {
  if (!row || row.zpid === undefined || row.zpid === null) return null;
  const price = num(obj(row.listingPrice).amount);
  const type = obj(row.listingType);
  return {
    zpid: String(row.zpid),
    address: addressOf(row),
    priceCents: price === null ? null : Math.round(price * 100),
    beds: num(row.bedrooms),
    baths: num(row.bathrooms),
    sqft: num(row.livingArea),
    status: statusOf(row),
    daysOnMarket: num(row.daysOnZillow),
    onMarketDate: str(row.onMarketDate),
    description: str(row.description),
    priceHistory: priceHistoryOf(row),
    isOpenHouse: type.isOpenHouse === true,
    openHouses: openHousesOf(row),
    candidates: candidatesOf(row),
    yearBuilt: num(row.yearBuilt) ?? num(obj(row.resoFacts).yearBuilt),
    lotSqft: lotOf(row),
    homeType: HOME_TYPES[str(row.homeType) ?? ''] ?? null,
    neighborhood: str(obj(row.listingAddress).subdivision) ?? str(obj(row.resoFacts).subdivisionName),
    highlights: highlightsOf(row),
  };
};

/** "2720-Carolyn-Dr-SE-Smyrna-GA-30080" → "2720 Carolyn Dr SE Smyrna GA 30080", a name until the import lands. */
export const labelFromUrl = (url: string): string => {
  const slug = url.match(/homedetails\/([^/]+)\//)?.[1];
  return slug ? decodeURIComponent(slug).replace(/-/g, ' ').slice(0, 120) : 'Zillow listing';
};
