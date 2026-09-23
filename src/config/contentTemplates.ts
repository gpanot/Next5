/**
 * Phase 0B — Template Engine configuration.
 * Plan: docs/business-studios/phases/phase-0b-template-engine.md
 */
import type { AssetFulfilment, AssetKind, ContentPurpose } from '@prisma/client';

export const CAMPAIGN_GOALS = ['leads', 'enquiries', 'sell'] as const;
export type CampaignGoal = (typeof CAMPAIGN_GOALS)[number];

export const isCampaignGoal = (v: unknown): v is CampaignGoal =>
  typeof v === 'string' && (CAMPAIGN_GOALS as readonly string[]).includes(v);

/**
 * The purpose each day of a campaign week serves, in order from the campaign's start date.
 *
 * `interest` is absent on purpose: none of the 18 Phase 0A templates carried it, so a slot
 * asking for it could never be filled (decision B4 in the phase plan).
 */
export const WEEKLY_RHYTHMS: Record<CampaignGoal, readonly ContentPurpose[]> = {
  leads: ['awareness', 'awareness', 'trust', 'trust', 'enquiry', 'trust', 'conversion'],
  enquiries: ['awareness', 'trust', 'enquiry', 'trust', 'enquiry', 'engagement', 'conversion'],
  sell: ['awareness', 'trust', 'conversion', 'enquiry', 'conversion', 'trust', 'conversion'],
};

export const RHYTHM_DAYS = 7;

/** Which of the day's three posting slots get used, by posts-per-day. Evening is the best slot, so it fills first. */
export const SLOTS_BY_POSTS_PER_DAY: Record<1 | 2 | 3, readonly ('morning' | 'midday' | 'evening')[]> = {
  1: ['evening'],
  2: ['midday', 'evening'],
  3: ['morning', 'midday', 'evening'],
};

/** How far back the matcher looks before it counts a template as recently used. */
export const ROTATION_WINDOW_DAYS = 14;

/**
 * What an asset kind is called in the UI. Every recommendation shows these, so a reader knows
 * what the template needs before committing to it.
 */
export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  person_on_camera: 'person on camera',
  product_footage: 'product footage',
  product_image: 'product photo',
  location_footage: 'location footage',
  customer_photo: 'customer photo',
  customer_footage: 'customer footage',
  logo: 'logo',
  on_screen_text: 'on-screen text',
  before_after_photo: 'before/after photo',
  before_footage: 'before footage',
  after_footage: 'after footage',
  demonstration: 'demonstration shot',
  spec_sheet_broll: 'spec sheet b-roll',
  trending_audio: 'trending audio',
  screen_recording: 'screen recording',
  generic_selfie: 'selfie',
};

/**
 * How each asset kind is satisfied when a template is created without saying.
 * `generate` kinds are produced by the UGC Lab (Seedance 2.5 / Wan 3.0, see src/config/ugcLab.ts),
 * so they never block a campaign — only `upload` kinds must come from the business.
 */
export const DEFAULT_FULFILMENT: Record<AssetKind, AssetFulfilment> = {
  person_on_camera: 'generate',
  demonstration: 'generate',
  on_screen_text: 'generate',
  spec_sheet_broll: 'generate',
  trending_audio: 'library',
  product_footage: 'upload',
  product_image: 'upload',
  location_footage: 'upload',
  customer_photo: 'upload',
  customer_footage: 'upload',
  logo: 'upload',
  before_after_photo: 'upload',
  before_footage: 'upload',
  after_footage: 'upload',
  screen_recording: 'upload',
  generic_selfie: 'upload',
};

/** "1 person on camera", "2 product footage" — the countable half of a requirement line. */
export const assetRequirementLabel = (kind: AssetKind, minCount: number): string =>
  `${minCount} ${ASSET_KIND_LABELS[kind]}`;
