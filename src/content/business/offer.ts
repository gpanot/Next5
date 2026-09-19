/**
 * Offer copy for /, /brand and /shop (US English, ~3rd-grade reading level).
 * Claims policy (docs/business-studios/README.md D10): "built to" wording until beta data exists; no invented
 * numbers, no fake testimonials. Value-stack prices are market estimates — keep `basis` accurate before launch.
 */

import type { ScoreDetailsDto } from '../../types/business/batches';

const IMG = '/images/business';

export type PlatformId = 'tiktok' | 'instagram' | 'facebook' | 'shopee' | 'linkedin';
/** Where a "paste your link" import can bring things in from. */
export type ImportSourceId = 'zillow' | 'tiktok_shop';
export type ChatGptRow = { topic: string; chatgpt: string; next5: string };
export type StackItem = { title: string; body: string; value: string; basis: string };
export type ExamplePost = { image: string; before?: string; score: number; details: ScoreDetailsDto; hook: string; caption: string; hashtags: string[]; description?: string };
export type Testimonial = {
  id: string;
  name: string;
  role: string;
  city: string;
  quote: string;
  result: { label: string; before: string; after: string } | null;
  /** Only verified, permission-given stories render in production. */
  verified: boolean;
};

type ProductOffer = {
  platforms: readonly PlatformId[];
  sources: readonly ImportSourceId[];
  hero: { eyebrow: string; title: string; sub: string; cta: string; note: string };
  example: ExamplePost;
  chatgpt: { title: string; sub: string; rows: readonly ChatGptRow[] };
  stack: { title: string; items: readonly StackItem[]; totalValue: string; priceLine: string; footnote: string };
  testimonials: readonly Testimonial[];
  promiseMatch: string;
};

const PROMISE_FEED = 'Post 12 Next5 photos in 30 days. If they don’t beat your last 12 posts, your next month is free.';

export const OFFER_SHARED = {
  promiseFeedTitle: 'Beat your feed, or your next month is free',
  promiseFeed: PROMISE_FEED,
  promiseFeedHow: 'You check it in your own Instagram or TikTok stats. Tell us in the app. That’s it.',
  testimonialsTitle: 'What our first members say',
  testimonialsPlaceholderNote: 'Example story — replace with real member feedback before launch.',
};

export const OFFER: { brand: ProductOffer; shop: ProductOffer } = {
  brand: {
    platforms: ['instagram', 'facebook', 'linkedin', 'tiktok'],
    sources: ['zillow'],
    hero: {
      eyebrow: 'For real estate agents',
      title: 'Your month of posts, done in 10 minutes.',
      sub: 'New photos of you, even inside your real listings, already placed on the days you post. Plus UGC videos made by our team. We write the hook, caption and hashtags too. No photo shoot.',
      cta: 'Start free: get 3 photos',
      note: 'No card needed. Takes about 5 minutes.',
    },
    example: {
      image: `${IMG}/us/realtor-hero.png`,
      score: 88,
      details: { version: 1, criteria: { stop: 9, subject: 9, thumbnail: 8, light: 9, fresh: 8, real: 9 }, tip: 'Post it Tuesday evening with a question in the first line.', bestFor: 'feed' },
      hook: 'The one thing buyers notice first in a home',
      caption: 'It’s not the kitchen. It’s the light. I help my clients find homes that feel bright all day. Want my list of sunny homes this month? Send me a message.',
      hashtags: ['#realtor', '#homebuying', '#dreamhome', '#newlisting', '#realestatetips', '#realtorlife'],
    },
    chatgpt: {
      title: 'Why not just use ChatGPT?',
      sub: 'You can try. Here is what happens when you post every week.',
      rows: [
        { topic: 'Your face', chatgpt: 'Changes a little in every photo. People notice.', next5: 'Looks like you in every photo, every month.' },
        { topic: 'Your time', chatgpt: 'Write a prompt, wait, fix it, try again. One photo at a time.', next5: 'Your month of photos in every size, in one click.' },
        { topic: 'What to post', chatgpt: 'You still have to think of the post.', next5: 'Hook, caption and hashtags written for each photo.' },
        { topic: 'When to post', chatgpt: 'You decide, every single time.', next5: 'Your month is already planned, on the days you pick.' },
        { topic: 'Trends', chatgpt: 'You guess what is popular.', next5: 'New trend themes every month, made for your job.' },
        { topic: 'Will it work?', chatgpt: 'No way to know before you post.', next5: 'A Scroll-Stop Score and a tip for every photo.' },
        { topic: 'Your brand', chatgpt: 'A new look every time.', next5: 'Your style keeps the same place, colors and look.' },
        { topic: 'Videos', chatgpt: 'Won’t make your Reels and TikToks.', next5: 'UGC videos every month, made by our team.' },
      ],
    },
    stack: {
      title: 'Everything you get with Growth',
      items: [
        { title: '120 new photos of you, every month', body: 'Trend themes, your style, every size.', value: '$690', basis: 'Half-day branding photo shoot with hair and makeup, US 2026 estimate' },
        { title: '4 UGC videos, every month', body: 'Short videos for Reels and TikTok, made by our team.', value: '$600', basis: '4 short videos at about $150 each, a typical US UGC creator rate in 2026 (estimate)' },
        { title: 'Post Kit for every photo', body: 'The hook, caption and hashtags, ready to paste.', value: '$200', basis: 'Freelance social media writer, about 20 posts a month' },
        { title: 'Scroll-Stop Score and tips', body: 'Know which photo to post first, and how.', value: '$50', basis: 'One hour with a social media coach' },
        { title: 'New trend themes every month', body: 'Fresh ideas for your job, ready on the 1st.', value: '$50', basis: 'Monthly content idea packs' },
        { title: 'Your month, planned for you', body: 'Every photo lands on a day. We even make the next ones for you.', value: '$150', basis: 'About 5 hours a month of an assistant planning and laying out a content calendar' },
      ],
      totalValue: '$1,740',
      priceLine: 'Your price: $99 a month',
      footnote: 'Values are typical US prices for the same work in 2026. Your prices may differ.',
    },
    testimonials: [
      { id: 'brand-example-1', name: 'Jenna', role: 'Realtor', city: 'Austin, TX', quote: 'I used to post the same photo for months. Now I post three times a week and it takes me ten minutes.', result: { label: 'Average likes', before: '38', after: '71' }, verified: false },
      { id: 'brand-example-2', name: 'Maria', role: 'Realtor', city: 'Phoenix, AZ', quote: 'My open house posts show me inside the real home. The captions sound like me. I just pick one and paste.', result: null, verified: false },
      { id: 'brand-example-3', name: 'Tasha', role: 'Real estate team lead', city: 'Tampa, FL', quote: 'The videos changed my page. New buyers tell me they found me on Reels.', result: { label: 'Buyer messages a month', before: '9', after: '17' }, verified: false },
    ],
    promiseMatch: 'If a photo doesn’t look like you, we redo it free. Two times per photo.',
  },
  shop: {
    platforms: ['tiktok', 'instagram', 'facebook'],
    sources: ['tiktok_shop'],
    hero: {
      eyebrow: 'For TikTok Shop sellers',
      title: 'Your new drops, photographed every week.',
      sub: 'Paste your TikTok Shop link. We bring in your products and make listing-ready photos worn by a model, in your shop’s style. Plus UGC videos made by our team. The description and hashtags are written for you.',
      cta: 'Paste my shop link: 3 free photos',
      note: 'No card needed. We photograph your best seller for free.',
    },
    example: {
      image: `${IMG}/us/shop-dress-after.png`,
      before: `${IMG}/shop/slider/dress-before.png`,
      score: 91,
      details: { version: 1, criteria: { stop: 9, subject: 10, thumbnail: 9, light: 9, fresh: 9, real: 9 }, tip: 'Use it as your first listing photo and your video cover.', bestFor: 'listing' },
      hook: 'The green dress you will wear all summer',
      caption: 'Soft, light and easy to move in. Wear it to brunch or dress it up for dinner. Tap to shop before your size is gone.',
      hashtags: ['#newarrivals', '#slipdress', '#summerstyle', '#ootd', '#tiktokshop', '#tiktokmademebuyit'],
      description: 'A soft sage green slip dress for warm days.\n• Light and easy to move in\n• Dress it up or down\n• Pairs with sandals or heels',
    },
    chatgpt: {
      title: 'Why not just use ChatGPT?',
      sub: 'You can make one photo. Here is what happens when you list 30 new products a week.',
      rows: [
        { topic: 'Your product', chatgpt: 'Often changes the color, print or length. Buyers return it.', next5: 'Keeps your real product. Checked side by side, with free redos.' },
        { topic: 'Your time', chatgpt: 'Download each product photo, write prompts, fix crops.', next5: 'Your store comes in by link. A whole drop in one click.' },
        { topic: 'Upload order', chatgpt: 'You sort and rename every file.', next5: 'Listing packs in TikTok’s upload order, with a video cover.' },
        { topic: 'Listings', chatgpt: 'You still write every description.', next5: 'Hook, product description and hashtags for every photo.' },
        { topic: 'Your brand', chatgpt: 'A new model and a new look every time.', next5: 'Same models and same shop look on every product.' },
        { topic: 'Will it sell?', chatgpt: 'No way to know before you post.', next5: 'A Scroll-Stop Score and a tip for every photo.' },
        { topic: 'Platform rules', chatgpt: 'No AI label in the file.', next5: 'AI label built into every file, the way TikTok asks.' },
        { topic: 'Videos', chatgpt: 'Won’t make the videos that sell on TikTok Shop.', next5: 'UGC videos of your products every month, made by our team.' },
      ],
    },
    stack: {
      title: 'Everything you get with Growth',
      items: [
        { title: '400 on-model photos every month', body: 'Your products, worn, in every TikTok Shop size.', value: '$1,170', basis: '30 photos at soona’s $39 per photo (2026 price list); Growth includes 400' },
        { title: 'Weekly drops and store sync', body: 'New stock found and picked for you every week.', value: '$200', basis: 'About 5 hours a month of a virtual assistant preparing listings, US freelance rates' },
        { title: 'TikTok listing packs', body: 'Up to 9 photos in upload order, plus a video cover.', value: '$150', basis: 'Sorting, resizing and naming listing photos, about 3 hours a month' },
        { title: 'Post Kit for every product', body: 'Hook, product description and hashtags, ready to paste.', value: '$150', basis: 'Freelance listing writer, about 30 listings a month' },
        { title: 'All 30 Studio models', body: '6 each for Asian, White, Black, Arabic and Latina, different ages and body types. No model to book.', value: '$150', basis: 'One half-day model booking' },
        { title: '4 UGC videos of your products, every month', body: 'Short videos for TikTok Shop and Reels, made by our team.', value: '$600', basis: '4 short videos at about $150 each, a typical US UGC creator rate in 2026 (estimate)' },
      ],
      totalValue: '$2,420',
      priceLine: 'Your price: $199 a month',
      footnote: 'Values are typical US prices for the same work in 2026 (soona’s public photo pricing and freelance rates). Your prices may differ.',
    },
    testimonials: [
      { id: 'shop-example-1', name: 'Ashley', role: 'TikTok Shop seller, women’s clothing', city: 'Dallas, TX', quote: 'I used to shoot in the mirror at night. Now my new stock is listed the same morning.', result: { label: 'Listings posted a week', before: '8', after: '30' }, verified: false },
      { id: 'shop-example-2', name: 'Priya', role: 'TikTok Shop boutique', city: 'Atlanta, GA', quote: 'The dress looks exactly like mine. And the videos finally get my products seen.', result: { label: 'Average views per video', before: '420', after: '1,100' }, verified: false },
      { id: 'shop-example-3', name: 'Carmen', role: 'TikTok Shop bag seller', city: 'Miami, FL', quote: 'The descriptions save me an hour a day.', result: null, verified: false },
    ],
    promiseMatch: 'If a photo doesn’t match your product, we redo it free. Two times per photo.',
  },
};

export const OFFER_HOME = {
  platforms: ['tiktok', 'instagram', 'facebook', 'linkedin'] as readonly PlatformId[],
  chatgpt: {
    title: 'Why not just use ChatGPT?',
    sub: 'You can make one photo. Posting every week is a different job.',
    rows: [
      { topic: 'You or your product', chatgpt: 'Your face or your product changes a little every time.', next5: 'Stays true in every photo, checked with free redos.' },
      { topic: 'Your time', chatgpt: 'One photo at a time. Prompts, fixes, crops.', next5: 'Your month of photos in one click.' },
      { topic: 'What to post', chatgpt: 'You still write every post.', next5: 'Hook, caption and hashtags written for each photo.' },
      { topic: 'Will it work?', chatgpt: 'No way to know before you post.', next5: 'A Scroll-Stop Score and a tip for every photo.' },
      { topic: 'Your brand', chatgpt: 'A new look every time.', next5: 'The same style on every post, every month.' },
      { topic: 'Videos', chatgpt: 'Won’t make your weekly TikToks and Reels.', next5: 'UGC videos every month, made by our team.' },
    ] satisfies ChatGptRow[],
  },
  promiseMatch: 'If a photo doesn’t look like you, or like your product, we redo it free. Two times per photo.',
};

export const HOME_TESTIMONIALS: readonly Testimonial[] = [OFFER.brand.testimonials[0]!, OFFER.shop.testimonials[0]!, OFFER.brand.testimonials[2]!];
