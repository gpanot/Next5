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
  postKit: PostKitDto | null;
  /** Scroll-Stop Score 0–100; null until scored. */
  score: number | null;
  scoreDetails: ScoreDetailsDto | null;
  errorMessage: string | null;
  /** Failed, and the one free retry on the fallback model is still available. */
  canRetry: boolean;
  /** When the current run was sent to the image model (in-flight items only) — drives the progress timer. */
  startedAt: string | null;
};

export type PostKitDto = { hook: string; caption: string; hashtags: string[]; description: string | null };

export type ScoreDetailsDto = {
  version: 1;
  criteria: Record<'stop' | 'subject' | 'thumbnail' | 'light' | 'fresh' | 'real', number>;
  tip: string;
  bestFor: 'feed' | 'story' | 'listing' | 'profile' | 'ad';
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

export type BatchProductDto = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  colorName: string | null;
  frontUrl: string | null;
  /** Photo angles this product has across all batches (made or in progress). */
  angleCount: number;
  /** The angles "Create more photos" would add next (empty when every angle is done). */
  nextShots: string[];
};

export type BatchDetailDto = BatchSummaryDto & { items: BatchItemDto[]; products: BatchProductDto[]; visibleAiTag: boolean };

export type BatchEstimateDto = { items: number; credits: number; balance: number; canAfford: boolean };
