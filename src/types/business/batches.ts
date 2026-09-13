/** Client-safe batch DTOs returned by /api/app/batches. */

export type ItemStatusDto = 'queued' | 'submitting' | 'generating' | 'ready' | 'failed';

export type BatchItemDto = {
  id: string;
  status: ItemStatusDto;
  format: string;
  sceneId: string | null;
  shot: string | null;
  productId: string | null;
  url: string | null;
  favorite: boolean;
  rating: number | null;
  freeRedosLeft: number;
  caption: string | null;
  errorMessage: string | null;
};

export type BatchProgressDto = { total: number; ready: number; failed: number; inFlight: number };

export type BatchSummaryDto = {
  id: string;
  kind: 'trial' | 'brand_theme' | 'shop_products';
  status: 'queued' | 'generating' | 'ready' | 'failed' | 'cancelled';
  name: string;
  formats: string[];
  highRes: boolean;
  setId: string | null;
  themeId: string | null;
  packId: string | null;
  creditsReserved: number;
  createdAt: string;
  completedAt: string | null;
  coverUrl: string | null;
  progress: BatchProgressDto;
};

export type BatchProductDto = { id: string; name: string; sku: string | null; category: string; colorName: string | null; frontUrl: string | null };

export type BatchDetailDto = BatchSummaryDto & { items: BatchItemDto[]; products: BatchProductDto[]; visibleAiTag: boolean };

export type BatchEstimateDto = { items: number; credits: number; balance: number; canAfford: boolean };
