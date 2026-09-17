// Shared by server and client: Zillow links, photo tags and listing status copy.
// Plan: docs/business-studios/13-zillow-import-plan.md.

export const PHOTO_TAGS = ['exterior', 'porch', 'living', 'kitchen', 'dining', 'bedroom', 'yard', 'bath', 'aerial', 'detail', 'floorplan'] as const;
export type PhotoTag = (typeof PHOTO_TAGS)[number];

export const isPhotoTag = (value: unknown): value is PhotoTag => PHOTO_TAGS.includes(value as PhotoTag);

const TAG_LABELS: Record<PhotoTag, string> = {
  exterior: 'Front of the home', porch: 'Porch', living: 'Living room', kitchen: 'Kitchen', dining: 'Dining room',
  bedroom: 'Bedroom', yard: 'Backyard', bath: 'Bathroom', aerial: 'Drone shot', detail: 'Close-up', floorplan: 'Floor plan',
};

export const tagLabel = (tag: string | null | undefined): string | null => (isPhotoTag(tag) ? TAG_LABELS[tag] : null);

/** Photos that rarely work with a person in them. Shown dimmed when adding photos back, still selectable. */
const WEAK_TAGS: readonly PhotoTag[] = ['bath', 'aerial', 'detail', 'floorplan'];
export const isWeakTag = (tag: string | null | undefined): boolean => isPhotoTag(tag) && WEAK_TAGS.includes(tag);

/** Below this width a photo gives the model little detail to keep. */
export const LOW_RES_WIDTH = 1000;
export const isLowRes = (width: number | null | undefined): boolean => typeof width === 'number' && width < LOW_RES_WIDTH;

export const LISTING_STATUSES = ['coming_soon', 'just_listed', 'for_sale', 'open_house', 'pending', 'sold', 'off_market'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

const STATUS_LABELS: Record<ListingStatus, string> = {
  coming_soon: 'Coming soon', just_listed: 'Just listed', for_sale: 'For sale', open_house: 'Open house',
  pending: 'Under contract', sold: 'Just sold', off_market: 'Off market',
};

export const statusLabel = (status: string | null | undefined): string | null =>
  status && (LISTING_STATUSES as readonly string[]).includes(status) ? STATUS_LABELS[status as ListingStatus] : null;

export type ZillowLink = { zpid: string; url: string };

/** Any zillow.com link with a `<digits>_zpid` segment → the zpid and a clean link without tracking. */
export const parseZillowUrl = (raw: string): ZillowLink | null => {
  const text = raw.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!/(^|\.)zillow\.com$/i.test(url.hostname)) return null;
  const match = url.pathname.match(/^(.*?\/(\d{4,})_zpid)\/?/);
  if (!match) return null;
  return { zpid: match[2]!, url: `https://www.zillow.com${match[1]}/` };
};

export const formatPrice = (cents: number | null | undefined): string | null =>
  typeof cents === 'number' ? `$${Math.round(cents / 100).toLocaleString('en-US')}` : null;

/** "$399,000 · 3 bd · 2 ba · 1,350 sqft" */
export const factsLine = (f: { priceCents: number | null; beds: number | null; baths: number | null; sqft: number | null }): string =>
  [formatPrice(f.priceCents), f.beds !== null ? `${f.beds} bd` : null, f.baths !== null ? `${f.baths} ba` : null, f.sqft ? `${f.sqft.toLocaleString('en-US')} sqft` : null]
    .filter(Boolean)
    .join(' · ');
