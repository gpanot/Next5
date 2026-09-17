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
  /** Her calendar post for this photo, if it has one. */
  calendar: { date: string; status: 'planned' | 'posted' | 'skipped' } | null;
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
  /** Post Kit for the whole listing (Shop), null until written. */
  postKit: PostKitDto | null;
  /** Ready photos of this product from its other batches, oldest first — the row shows the whole listing. */
  otherPhotos: ProductPhotoDto[];
};

export type ProductPhotoDto = { id: string; batchId: string; url: string | null; shot: string | null; format: string; score: number | null };

export type BatchDetailDto = BatchSummaryDto & {
  items: BatchItemDto[];
  products: BatchProductDto[];
  visibleAiTag: boolean;
  /** Made from one of her properties: she adds the photos she likes to the calendar herself. */
  listingId: string | null;
};

/** One series in the library: a batch with its category. */
export type LibrarySeriesDto = {
  id: string;
  name: string;
  /** property = made from a property (Zillow or her uploads), theme = a monthly theme, trial = free photos. */
  category: 'property' | 'theme' | 'trial';
  /** "Zillow · 2720 Carolyn Dr SE", "Property · 24 Oak St", "Just Listed", "Free photos" */
  categoryLabel: string;
  coverUrl: string | null;
  photoCount: number;
  onCalendar: number;
  createdAt: string;
};

export type BatchEstimateDto = { items: number; credits: number; balance: number; canAfford: boolean };
