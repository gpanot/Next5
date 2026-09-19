/**
 * Copy for the business home at `/` (US English, 3rd-grade reading level: short words, one idea per sentence).
 * Numbers come from src/config/plans.ts and ./ugc.ts so the page never disagrees with pricing.
 * Image paths must exist in public/images/manifest.json.
 */

import { plansForProduct, type ProductLineId } from '../../config/plans';
import { formatUsd } from '../../lib/money';
import type { FaqItem } from './marketing';
import { UGC_VIDEOS_PER_MONTH } from './ugc';

const US = '/images/business/us';

/** Cheapest self-serve plan for a product: price, photos and videos a month. */
const starterFor = (product: ProductLineId) => {
  const plan = [...plansForProduct(product)].filter((p) => !p.contactOnly).sort((a, b) => a.monthlyUsdCents - b.monthlyUsdCents)[0]!;
  const videos = UGC_VIDEOS_PER_MONTH[plan.id] ?? 0;
  return { price: formatUsd(plan.monthlyUsdCents), photos: plan.monthlyCredits, videos, planProduct: product };
};

const plural = (count: number, word: string): string => `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

export const STARTER = { brand: starterFor('brand'), shop: starterFor('shop') };

/** "30 photos + 1 video a month" */
export const includesLine = (product: ProductLineId): string =>
  `${plural(STARTER[product].photos, 'photo')} + ${plural(STARTER[product].videos, 'video')} a month`;

export type HomeDoor = { id: ProductLineId; href: string; label: string; line: string; image: string };

export const HOME_HERO = {
  title: 'New photos and videos. Every month.',
  sub: 'For realtors and TikTok Shop sellers. No photo shoot.',
  pick: 'Pick one to start:',
  doors: [
    { id: 'brand', href: '/brand', label: 'I’m a realtor', line: 'Photos of you + videos', image: `${US}/realtor-hero.png` },
    { id: 'shop', href: '/shop', label: 'I sell on TikTok Shop', line: 'Your products on a model + videos', image: `${US}/shop-dress-after.png` },
  ] satisfies HomeDoor[],
  trust: ['3 free photos', 'No card needed', 'Free redos'],
};

export type MonthTile = { image: string; kind: 'photo' | 'video'; who: 'Realtor' | 'TikTok Shop' };

/** "A month of posts": real sample outputs, photo and video, both buyers. */
export const HOME_MONTH = {
  eyebrow: 'What you get',
  title: 'A month of posts. Made for you.',
  sub: 'Photos and short videos, sized for TikTok, Instagram and Facebook.',
  tiles: [
    { image: `${US}/realtor-front-yard.png`, kind: 'photo', who: 'Realtor' },
    { image: `${US}/shop-video.png`, kind: 'video', who: 'TikTok Shop' },
    { image: `${US}/realtor-open-house.png`, kind: 'photo', who: 'Realtor' },
    { image: `${US}/shop-set-after.png`, kind: 'photo', who: 'TikTok Shop' },
    { image: `${US}/realtor-video.png`, kind: 'video', who: 'Realtor' },
    { image: `${US}/shop-bag-after.png`, kind: 'photo', who: 'TikTok Shop' },
  ] satisfies MonthTile[],
};

export const HOME_PROOF = {
  eyebrow: 'See it work',
  title: 'Your product in. A model wearing it out.',
  sub: 'Slide across the photo. Left is the plain photo. Right is what Next5 made.',
  points: ['Same color, print and length.', 'Worn by you or one of our models.', 'Ready in minutes.'],
  kit: {
    title: 'The words come with it',
    sub: 'Hook, description and hashtags, written like top-selling posts. Plus a score from 0 to 100.',
    example: 'Example · the dress',
  },
  cta: 'Get 3 free photos',
};

export const HOME_CHOOSER = {
  eyebrow: 'Pick your plan',
  title: 'Realtor or TikTok Shop seller?',
  products: [
    {
      href: '/brand',
      eyebrow: 'For realtors',
      title: 'Photos and videos of you.',
      body: 'Paste your Zillow link. Show up in your real listings. Post for just listed, open house and just sold.',
      image: `${US}/realtor-listing.png`,
      cta: 'See the realtor plan',
      planProduct: 'brand' as const,
    },
    {
      href: '/shop',
      eyebrow: 'For TikTok Shop sellers',
      title: 'Your products on a model.',
      body: 'Paste your shop link. Get photos for every new product, and videos that sell them.',
      image: `${US}/shop-set-after.png`,
      cta: 'See the TikTok Shop plan',
      planProduct: 'shop' as const,
    },
  ],
};

const CAL = `${US}/brand`;

/** One example month on Growth: posts on Tue, Thu and Sat. Saturday posts are the videos. */
export const HOME_CALENDAR = {
  month: 'Your month',
  /** Day 1 falls on a Tuesday (Monday-first week). */
  firstWeekday: 1,
  days: 30,
  postWeekdays: [1, 3, 5],
  videoWeekday: 5,
  photos: [
    `${CAL}/themes/just-listed.png`, `${CAL}/sets/modern-office.png`, `${CAL}/themes/open-house.png`,
    `${CAL}/sets/neighborhood-cafe.png`, `${CAL}/themes/client-meeting.png`, `${CAL}/sets/listing-interior.png`,
    `${CAL}/sets/urban-outdoor.png`, `${CAL}/sets/home-office.png`, `${CAL}/sets/studio-backdrop.png`,
  ],
  videos: [`${US}/realtor-video.png`, `${CAL}/themes/behind-the-scenes.png`, `${CAL}/themes/market-update.png`, `${CAL}/themes/new-year-goals.png`],
  caption: 'Example month on Growth. 3 posts a week, placed for you. 4 of them are videos.',
};

export const HOME_STEPS = [
  { title: 'Send your photos', body: 'Realtors send 3 selfies. Sellers paste their shop link.' },
  { title: 'Pick a look', body: 'Pick a place and a style. It stays the same every month.' },
  { title: 'Post all month', body: 'Your photos land on your calendar. Our team sends your videos.' },
];

const brand = STARTER.brand;
const shop = STARTER.shop;

export const HOME_FAQ: FaqItem[] = [
  { q: 'Who is Next5 for?', a: 'Two groups. Realtors who need new photos and videos of themselves. And TikTok Shop sellers who need photos and videos of their products.' },
  { q: 'What are UGC videos?', a: `Short videos for TikTok, Reels and Shorts. They look like videos people film on their phones. Our team makes them for you each month. Growth gets ${UGC_VIDEOS_PER_MONTH.brand_pro} a month.` },
  { q: 'How much does it cost?', a: `Realtors start at ${brand.price} a month for ${includesLine('brand')}. TikTok Shop starts at ${shop.price} a month for ${includesLine('shop')}. Your first 3 photos are free. Videos come with a paid plan.` },
  { q: 'Will it look like me, or like my product?', a: 'Yes. We use your selfies or your product photo every time. If a photo looks wrong, we redo it for free. You get 2 free redos per photo.' },
  { q: 'Can’t I just use ChatGPT?', a: 'You can make one photo. But your face or product changes each time. You still write every post. And it will not make your videos. Next5 does all of that for you.' },
  { q: 'How do I pay?', a: 'You pay up front for 1, 3 or 6 months. Longer plans cost less. Nothing renews on its own. We remind you before your plan ends.' },
  { q: 'Who owns the photos and videos?', a: 'You do. Use them on social media, your website, your listings and your ads. Each photo has an AI label inside, as TikTok and Meta ask.' },
];

export const HOME_FINAL = {
  title: 'Stop posting the same old photos.',
  body: 'Get 3 free photos today. No card needed.',
  brand: { href: '/start/brand', cta: 'Start free as a realtor' },
  shop: { href: '/start/shop', cta: 'Start free for my shop' },
};

