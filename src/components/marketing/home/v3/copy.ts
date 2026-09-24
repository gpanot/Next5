/**
 * Audience-specific copy for homepage v3.
 * Single source of truth: the server render reads it directly and the inline
 * script receives it as JSON so the audience toggle swaps the same strings.
 */
export type Audience = 'realtor' | 'service' | 'seller';

export const AUDIENCES: Audience[] = ['realtor', 'service', 'seller'];

export interface AudienceCopy {
  h1: string;
  sub: string;
  ph: string;
  demo: string;
  hooks: string[];
  facts: string[];
  s0: string;
  label: string;
  noun: string;
  photos: string;
  statNum: string;
  statText: string;
  src: string;
  pain1: string;
  fit1: string;
  dd: string;
}

export const AUDIENCE_COPY: Record<Audience, AudienceCopy> = {
  realtor: {
    h1: 'Every listing, turned into a month of videos.',
    sub: "Paste your Zillow link. In 2 minutes you're watching your first video. Your whole month is planned before you finish your coffee.",
    ph: 'zillow.com/homedetails/...',
    demo: 'https://www.zillow.com/homedetails/1204-Oak-Ridge-Dr-Austin-TX',
    hooks: ['Wait till you see the kitchen.', 'This backyard sold me.', '3 bd in Austin. Come look.'],
    facts: ['$649,000', '3 bd', '2 ba', 'Austin, TX'],
    s0: 'Pulling your 24 listing photos',
    label: 'Video: listing slideshow, 9:16',
    noun: 'listing',
    photos: 'photos of you',
    statNum: '39%',
    statText: 'of realtors say social media brings their best leads, more than any other tool.',
    src: 'NAR Technology Survey, 2025',
    pain1: 'Showings, calls, paperwork. Posting is always tomorrow.',
    fit1: 'You have listings and want more people to see them',
    dd: "You're gonna fall in love with this one.",
  },
  service: {
    h1: 'Every job, turned into a month of videos.',
    sub: "Paste your website. In 2 minutes you're watching your first video. Your whole month is planned before your next service call.",
    ph: 'yourbusiness.com',
    demo: 'https://www.brightlineelectric.com',
    hooks: ['3 signs your panel needs an upgrade.', 'Is your breaker doing this?', 'What a same-day fix looks like.'],
    facts: ['Licensed and insured', 'Same-day service', 'Austin, TX'],
    s0: 'Reading your website and job photos',
    label: 'Video: tip video over your job photos, 9:16',
    noun: 'job',
    photos: 'photos of your team and work',
    statNum: '40%',
    statText: 'of millennial homeowners use social media to find roofing contractors.',
    src: 'Roofing Contractor homeowner survey, 2025',
    pain1: "You're on a roof, under a sink or in a crawlspace. Posting is always tomorrow.",
    fit1: 'You do great work and want more people to see it',
    dd: "Don't ignore this noise from your AC.",
  },
  seller: {
    h1: 'Every product, turned into a month of videos.',
    sub: "Paste your TikTok Shop link. In 2 minutes you're watching your first video. Your whole month is planned before your next restock.",
    ph: 'shop.tiktok.com/view/product/...',
    demo: 'https://shop.tiktok.com/view/product/linen-midi-dress',
    hooks: ['The dress everyone keeps asking about.', '1,240 sold for a reason.', '4 colors. Which one is you?'],
    facts: ['$38', '1,240 sold', '4 colors'],
    s0: 'Pulling your 8 product photos',
    label: 'Video: product video, 9:16',
    noun: 'product',
    photos: 'try-on photos on a model',
    statNum: '215,000+',
    statText: 'US small businesses sell on TikTok Shop. Standing out takes volume.',
    src: 'TikTok Shop via Modern Retail, 2026',
    pain1: 'Sourcing, packing, shipping. Posting is always tomorrow.',
    fit1: 'You have products that deserve more views',
    dd: "1,240 sold. Here's why.",
  },
};
