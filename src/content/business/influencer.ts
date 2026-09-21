/**
 * The demo influencer shown before a user adds her own photos, and in every style's sample photos.
 * Samples are real Next5 output (scripts/gen-influencer-samples.ts), all from one portrait, so it is
 * one person in many looks. Paths must exist in public/images/manifest.json.
 */

import type { ProductLineDto } from '../../types/business/me';

const ROOT = '/images/business/us/influencer';

export const DEMO_INFLUENCER = {
  name: 'Sarah',
  portrait: `${ROOT}/sarah-face.png`,
};

const SAMPLE_COUNT = 4;

/** Sample photo paths for one style (Brand) or look (Shop) template, in display order. */
export const influencerSamples = (product: ProductLineDto, templateId: string): string[] =>
  Array.from({ length: SAMPLE_COUNT }, (_, i) => `${ROOT}/${product}/${templateId}-${i + 1}.png`);
