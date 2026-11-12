/**
 * Realtor listing video presets (test). Photos come from the Zillow scrape (blitz_listing_runs),
 * already picked and ordered into beats by the shot plan (see docs/realtor-video-presets.md).
 */

export type RoomTag =
  | 'exterior' | 'porch' | 'living' | 'kitchen' | 'feature'
  | 'bedroom' | 'bathroom' | 'yard' | 'aerial';

/** One beat = one moment of the walk-through. Split layouts use two photos per beat. */
export type ListingBeat = {
  photo: string;
  /** Second photo, used by the split layout only. */
  photo2?: string;
  room: RoomTag;
  /** Small tracked caps line ("UPDATED"). */
  kicker: string;
  /** Punch word or phrase ("Kitchen"). */
  title: string;
  /** Handwritten note for the scrapbook layout ("brick wall!"). */
  note?: string;
};

export type ListingFacts = {
  city: string;
  state: string;
  priceLabel: string;
  beds: number;
  baths: number;
  sqft: number;
  hookTop: string;
  hookBottom: string;
  locationLine: string;
  ctaKeyword: string;
  street?: string;
  yearBuilt?: number;
};

export type ListingVideoProps = {
  facts: ListingFacts;
  beats: ListingBeat[];
  /** Photo for the last beat (location / price / CTA). */
  endPhoto: string;
  /** Fast formats: more photos at ~1.2 s each, with a short room label. */
  reel: ReelShot[];
};

export type ReelShot = { photo: string; label: string };
