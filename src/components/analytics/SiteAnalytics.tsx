'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

const KEEP_PARAMS = new Set(['plan', 'term', 'welcome', 'product']);

/** Drops query params that could carry secrets or PII (magic-link `token`, emails) before sending to Vercel. */
const scrub = (event: BeforeSendEvent): BeforeSendEvent => {
  const url = new URL(event.url);
  for (const key of [...url.searchParams.keys()]) if (!KEEP_PARAMS.has(key)) url.searchParams.delete(key);
  return { ...event, url: url.toString() };
};

export const SiteAnalytics = () => <Analytics beforeSend={scrub} />;
