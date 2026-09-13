/**
 * Business-surface feature flags and constants.
 * Server-side only — never import from client components directly.
 * Expose values to the client only via API responses.
 */

export const isBusinessEnabled = (): boolean =>
  process.env.NEXT5_BUSINESS_ENABLED === 'true';

export const TRIAL_CREDITS = 3;
export const FREE_REDOS_PER_ITEM = 2;
export const MAX_BATCH_ITEMS = 200;

/**
 * FX rate used to convert USD prices to VND.
 * Set VND_PER_USD in your environment; defaults to 26 000.
 * Client components must NOT read this directly — get it from API responses.
 */
export const VND_PER_USD: number = Number(process.env.VND_PER_USD ?? 26_000);

/** nano-banana-2/edit accepts up to 14 reference images; we send at most 5 to limit drift. */
export const MAX_REFERENCE_IMAGES = 5;

/**
 * Max WaveSpeed tasks in flight at once across all batches.
 * Default is 3 (good for testing). Set GENERATION_MAX_CONCURRENT=6 in production.
 */
export const generationMaxConcurrent = (): number => Number(process.env.GENERATION_MAX_CONCURRENT ?? 3);

/** Automatic attempts per generation run before an item is marked failed. */
export const MAX_ATTEMPTS_PER_RUN = 2;
