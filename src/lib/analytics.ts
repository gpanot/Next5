import { track as vercelTrack } from '@vercel/analytics';

/**
 * Funnel events → Vercel Web Analytics (custom events). Client-side only.
 * Event names: docs/business-studios/02-architecture.md §12. Never pass PII (emails, names, photos, tokens).
 * Custom events show in the Vercel dashboard on Pro/Enterprise; page views work on every plan.
 */

export type AnalyticsEvent =
  | 'landing_viewed' | 'cta_clicked' | 'onboarding_step_completed' | 'trial_generated' | 'checkout_opened'
  | 'plan_requested' | 'payment_paid' | 'batch_created' | 'batch_completed' | 'item_redo' | 'item_downloaded'
  | 'zip_downloaded' | 'topup_purchased' | 'renewal_reminder_clicked' | 'post_kit_created' | 'promise_claimed' | 'store_connected' | 'listing_pack_downloaded' | 'more_photos_created'
  | 'post_marked' | 'post_published' | 'calendar_planned';

export type AnalyticsProps = Record<string, string | number | boolean | null>;

export const track = (event: AnalyticsEvent, props: AnalyticsProps = {}): void => {
  if (process.env.NODE_ENV === 'development') console.debug('[analytics]', event, props);
  try {
    vercelTrack(event, props);
  } catch {
    // Analytics must never break the product.
  }
};
