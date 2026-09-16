/** Client-safe product DTOs. */

export type ProductDto = {
  id: string;
  name: string;
  category: string;
  colorName: string | null;
  sku: string | null;
  fit: string | null;
  notes: string | null;
  frontUrl: string | null;
  backUrl: string | null;
  detailUrl: string | null;
  /** Archived products are hidden from drops until the seller brings them back. */
  archived: boolean;
  timesUsed: number;
  lastUsedAt: string | null;
  createdAt: string;
  /** upload | tiktok_scrape | tiktok_export | tiktok_api */
  source: string;
  externalUrl: string | null;
  priceCents: number | null;
  currency: string | null;
  soldCount: number | null;
  /** Sold since the first import snapshot (null when there is no baseline yet). */
  soldSinceImport: number | null;
  /** Listing images (imported products); the reference is `frontImageUrl`. */
  imageUrls: string[];
  frontImageUrl: string | null;
  /** Reference photo still downloading — can't generate yet. */
  photoPending: boolean;
  variantCount: number;
  colors: string[];
  detailsFetched: boolean;
};
