/**
 * UGC video offer for the marketing pages (US English, ~3rd-grade reading level).
 * UGC videos are made by the Next5 team and sent each month; they are not a studio feature,
 * so this data lives here and not in src/config/plans.ts (the studio reads `plan.features`).
 * Image paths must exist in public/images/manifest.json.
 */

import type { Plan, PlanId } from '../../config/plans';

const IMG = '/images/business';

/** UGC videos per month for each plan. `null` = custom volume (sold by conversation). */
export const UGC_VIDEOS_PER_MONTH: Record<PlanId, number | null> = {
  brand_starter: 1,
  brand_pro: 4,
  brand_agency: 40,
  shop_starter: 1,
  shop_pro: 4,
  shop_scale: 4,
  shop_agency: null,
};

const videoCount = (count: number): string => `${count} UGC video${count === 1 ? '' : 's'}`;

/** Plan-card line, shown right after the monthly photo count. */
export const ugcFeatureLine = (plan: Plan): string => {
  const count = UGC_VIDEOS_PER_MONTH[plan.id];
  return count === null ? 'Custom UGC video volume' : `${videoCount(count)} every month, made by our team`;
};

/** Comparison-table cell. */
export const ugcTableValue = (plan: Plan): string => {
  const count = UGC_VIDEOS_PER_MONTH[plan.id];
  return count === null ? 'Custom' : String(count);
};

export type UgcVideoExample = {
  poster: string;
  handle: string;
  /** On-screen caption, one short line per beat. */
  captions: readonly string[];
  duration: string;
};

export type UgcOffer = {
  eyebrow: string;
  title: string;
  sub: string;
  points: readonly string[];
  video: UgcVideoExample;
};

const SHARED_POINTS = [
  'Made by our team and sent to you every month.',
  'Tall 9:16 for TikTok, Reels and Shorts.',
  'Captions on screen, so it works with the sound off.',
];

export const UGC: { brand: UgcOffer; shop: UgcOffer } = {
  brand: {
    eyebrow: 'Videos too',
    title: 'Short videos for Reels and TikTok. Made for you.',
    sub: 'Short videos are how new buyers and sellers find you. Each month our team makes UGC videos for your page: a strong hook, a short script and captions on screen.',
    points: [`${videoCount(UGC_VIDEOS_PER_MONTH.brand_pro ?? 0)} a month on Growth. 1 on Starter.`, 'Hooks taken from real estate videos that already do well.', ...SHARED_POINTS],
    video: {
      poster: `${IMG}/us/realtor-video.png`,
      handle: 'your.name',
      captions: ['3 things buyers', 'check first', 'at a showing'],
      duration: '0:15',
    },
  },
  shop: {
    eyebrow: 'Videos too',
    title: 'UGC videos that sell your products.',
    sub: 'On TikTok Shop, people find products in videos. Each month our team makes UGC videos for your best sellers: a strong hook, a short script and captions on screen.',
    points: [`${videoCount(UGC_VIDEOS_PER_MONTH.shop_pro ?? 0)} a month on Growth. 1 on Starter.`, 'Hooks taken from TikTok Shop videos that already sell.', ...SHARED_POINTS],
    video: {
      poster: `${IMG}/us/shop-video.png`,
      handle: 'your.shop',
      captions: ['The coat I wear', 'every single day', 'this fall'],
      duration: '0:12',
    },
  },
};

export const UGC_HOME = {
  eyebrow: 'Videos too',
  title: 'Plus UGC videos, made by our team.',
  sub: 'Short videos are how new people find you on TikTok and Reels. Each month our team makes them for you: a strong hook, a short script and captions on screen.',
  points: [
    `Realtors: ${videoCount(UGC_VIDEOS_PER_MONTH.brand_pro ?? 0)} a month on Growth, made for your page.`,
    `TikTok Shop: ${videoCount(UGC_VIDEOS_PER_MONTH.shop_pro ?? 0)} a month on Growth, made from your products.`,
    'Starter plans get 1 video a month to try it.',
    SHARED_POINTS[0]!,
  ],
};
