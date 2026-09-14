/** "Beat your feed" promise terms — one place for pages, app and server. */
export const PROMISE = {
  postsRequired: 12,
  windowDays: 30,
  /** Days between two claims for the same workspace. */
  claimCooldownDays: 30,
  platforms: ['instagram', 'tiktok', 'facebook', 'shopee', 'other'] as const,
  metrics: ['likes', 'views', 'saves', 'clicks'] as const,
};

export type PromisePlatform = (typeof PROMISE.platforms)[number];
export type PromiseMetric = (typeof PROMISE.metrics)[number];
