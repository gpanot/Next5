/**
 * Analytics wrapper. Provider not chosen yet (P9 open question) — events are no-ops, logged in development.
 * Event names: docs/business-studios/02-architecture.md §12. Never pass PII (emails, names, photos).
 */

export type AnalyticsEvent =
  | 'landing_viewed' | 'cta_clicked' | 'onboarding_step_completed' | 'trial_generated' | 'checkout_opened'
  | 'payment_paid' | 'batch_created' | 'batch_completed' | 'item_redo' | 'item_downloaded' | 'zip_downloaded'
  | 'topup_purchased' | 'renewal_reminder_clicked';

export type AnalyticsProps = Record<string, string | number | boolean | null>;

export const track = (event: AnalyticsEvent, props: AnalyticsProps = {}): void => {
  if (process.env.NODE_ENV === 'development') console.debug('[analytics]', event, props);
};
