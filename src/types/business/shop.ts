/** Client-safe DTOs for the TikTok Shop store import (Shop Studio). */

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
