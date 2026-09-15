/** Client-safe DTOs for the TikTok Shop store import (Shop Studio). */

import type { PostKitDto } from './batches';

export type ShopConnectionDto = {
  id: string;
  source: 'scrape' | 'export' | 'api';
  status: 'pending' | 'syncing' | 'ready' | 'failed';
  shopUrl: string | null;
  shopName: string | null;
  shopLogoUrl: string | null;
  productCount: number;
  totalSold: number | null;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  error: string | null;
  /** Local/dev: the import replays sample data instead of calling the scraper. */
  demoData: boolean;
};

export type PackStatusDto = 'draft' | 'ready' | 'uploaded';

export type PackPhotoDto = { itemId: string; url: string | null; format: string; shot: string | null; score: number | null };

export type ListingPackSummaryDto = {
  productId: string;
  name: string;
  sku: string | null;
  originalUrl: string | null;
  mainUrl: string | null;
  photoCount: number;
  hasCover: boolean;
  status: PackStatusDto;
  warnings: string[];
};

export type ListingPackDto = {
  productId: string;
  name: string;
  sku: string | null;
  externalUrl: string | null;
  originalUrl: string | null;
  status: PackStatusDto;
  slots: PackPhotoDto[];
  extra: PackPhotoDto[];
  covers: PackPhotoDto[];
  coverItemId: string | null;
  hiddenItemIds: string[];
  warnings: string[];
  visibleAiTag: boolean;
  description: string | null;
  mainItemId: string | null;
  /** Listing Post Kit (whole series), null until written. */
  postKit: PostKitDto | null;
  /** 9:16 covers still being created. */
  coversInProgress: number;
};
