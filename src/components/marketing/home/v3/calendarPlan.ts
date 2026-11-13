/**
 * Example month for the "Your month, already planned" section: what Autopilot fills from one
 * listing (2784 Bell Dr) plus the area playbooks. November 2026 starts on a Sunday (US week).
 * Video days use real frames of the Bell Dr videos; other days use photos in public/images/manifest.json.
 */
export type PostKind = 'video' | 'slides' | 'market';

export type PlanDay = {
  day: number;
  kind: PostKind;
  /** What Autopilot posts that day. */
  label: string;
  img: string;
  /** Set on the 6 days a typical agent posts without Autopilot. */
  before?: string;
};

const V = '/videos/listing/bell-';
const IMG = {
  porch: '/images/business/us/listing/porch-before.png',
  living: '/images/business/us/listing/living-before.png',
  kitchen: '/images/business/us/listing/kitchen-before.png',
  porchAgent: '/images/business/us/listing/porch-after.png',
  livingAgent: '/images/business/us/listing/living-after.png',
  kitchenAgent: '/images/business/us/listing/kitchen-after.png',
  market: '/images/business/us/brand/themes/market-update.png',
  openHouse: '/images/business/us/realtor-open-house.png',
  frontYard: '/images/business/us/realtor-front-yard.png',
  justListed: '/images/business/us/brand/themes/just-listed.png',
  tipsA: '/images/business/us/influencer/brand/listing-interior-1.png',
  tipsB: '/images/business/us/influencer/brand/modern-office-1.png',
  tipsC: '/images/business/us/influencer/brand/home-office-1.png',
  cafe: '/images/business/us/influencer/brand/neighborhood-cafe-1.png',
  holiday: '/images/business/us/influencer/brand/holiday-season-1.png',
};

/** Weekday of Nov 1, 2026 (0 = Sunday). */
export const FIRST_WEEKDAY = 0;
export const MONTH_LABEL = 'November';
/** Market area of the example agent (the Bell Dr listing is in Smyrna, GA). */
export const MARKET_AREA = 'Smyrna';

export const PLAN: PlanDay[] = [
  { day: 1, kind: 'slides', label: 'Buyer tips', img: IMG.tipsA },
  { day: 2, kind: 'market', label: 'Market update', img: IMG.market },
  { day: 3, kind: 'slides', label: 'Coming soon', img: IMG.porch },
  { day: 4, kind: 'video', label: 'Editorial tour', img: `${V}editorial.jpg`, before: 'Just listed photo' },
  { day: 5, kind: 'slides', label: 'Room by room', img: IMG.living },
  { day: 6, kind: 'video', label: 'Rate this house', img: `${V}rate.jpg` },
  { day: 7, kind: 'slides', label: 'Neighborhood', img: IMG.cafe },
  { day: 8, kind: 'slides', label: 'What buyers miss', img: IMG.kitchen },
  { day: 9, kind: 'market', label: 'Market update', img: IMG.market },
  { day: 10, kind: 'slides', label: 'Still available', img: IMG.porchAgent, before: 'Still available' },
  { day: 11, kind: 'video', label: 'POV: you live here', img: `${V}pov.jpg` },
  { day: 12, kind: 'video', label: 'Open house video', img: `${V}alert.jpg` },
  { day: 13, kind: 'slides', label: 'What to check', img: IMG.livingAgent },
  { day: 14, kind: 'slides', label: 'Open house today', img: IMG.openHouse, before: 'Open house flyer' },
  { day: 15, kind: 'slides', label: 'Home value tips', img: IMG.tipsB },
  { day: 16, kind: 'market', label: 'Market update', img: IMG.market },
  { day: 17, kind: 'video', label: '3 things I love', img: `${V}top3.jpg` },
  { day: 18, kind: 'video', label: 'New price video', img: `${V}editorial.jpg` },
  { day: 19, kind: 'slides', label: 'New price', img: IMG.kitchenAgent, before: 'Price drop photo' },
  { day: 20, kind: 'video', label: 'Worth it now?', img: `${V}rate.jpg` },
  { day: 21, kind: 'slides', label: 'Local spotlight', img: IMG.cafe },
  { day: 22, kind: 'slides', label: 'First-time buyer', img: IMG.tipsC },
  { day: 23, kind: 'market', label: 'Market update', img: IMG.market },
  { day: 24, kind: 'slides', label: 'Just sold', img: IMG.frontYard, before: 'Just sold' },
  { day: 25, kind: 'slides', label: 'How we sold it', img: IMG.justListed },
  { day: 26, kind: 'slides', label: 'Happy Thanksgiving', img: IMG.holiday, before: 'Happy Thanksgiving' },
  { day: 27, kind: 'video', label: 'Luxury showcase', img: `${V}luxe.jpg` },
  { day: 28, kind: 'slides', label: 'Weekend tour', img: IMG.porchAgent },
  { day: 29, kind: 'slides', label: 'Seller tips', img: IMG.tipsA },
  { day: 30, kind: 'market', label: 'Market update', img: IMG.market },
];

export const KIND_LABEL: Record<PostKind, string> = { video: 'Voiced video', slides: 'Slideshow', market: 'Market update' };

export const countKind = (kind: PostKind) => PLAN.filter((d) => d.kind === kind).length;
export const BEFORE_COUNT = PLAN.filter((d) => d.before).length;
/** Days Autopilot fills or upgrades, in fill order (day order, so the month fills top to bottom while scrolling). */
export const ADDED_DAYS = PLAN.map((d) => d.day);
