/**
 * Plans, prepaid terms and top-ups for Next5 Brand + Next5 Shop.
 * Spec: docs/business-studios/01-product-spec.md §4.
 *
 * Launch defaults — change prices here and every page, checkout and email follows.
 * Pure data + pure functions: safe to import from client and server.
 */

export type ProductLineId = 'brand' | 'shop';

export type PlanId = 'brand_starter' | 'brand_pro' | 'brand_agency' | 'shop_starter' | 'shop_pro' | 'shop_scale';

/** Monthly or yearly, both prepaid. Older 3- and 6-month subscriptions stay valid in the database (term_months is an int). */
export type TermMonths = 1 | 12;

export type Plan = {
  id: PlanId;
  product: ProductLineId;
  /** Display name. `*_pro` ids are sold as "Growth" (ids kept stable for stored subscriptions). */
  name: string;
  tagline: string;
  /** Who it is for, shown on plan cards. */
  audience: string;
  monthlyUsdCents: number;
  monthlyCredits: number;
  highRes: boolean;
  /** Post Kit: hook, caption, hashtags (and a product description on Shop) for every video. */
  postKit: boolean;
  allStudioModels: boolean;
  priority: boolean;
  mostPopular: boolean;
  /** Shop: products imported from the store per sync. */
  storeProducts: number;
  /** Shop: weekly/biweekly drop schedule. */
  drops: boolean;
  features: readonly string[];
};

export const PLANS: Record<PlanId, Plan> = {
  brand_starter: {
    id: 'brand_starter',
    product: 'brand',
    name: 'Starter',
    tagline: 'New videos of you for your weekly posts.',
    audience: 'To get started',
    monthlyUsdCents: 2_900,
    monthlyCredits: 30,
    highRes: false,
    postKit: false,
    allStudioModels: false,
    priority: false,
    mostPopular: false,
    storeProducts: 0,
    drops: false,
    features: ['30 videos every month', 'Your posting calendar, planned for you', 'Scroll-Stop Score on every video', 'Every monthly trend theme', 'All social sizes'],
  },
  brand_pro: {
    id: 'brand_pro',
    product: 'brand',
    name: 'Growth',
    tagline: 'Your whole month of posts, done.',
    audience: 'For solo pros who want to grow',
    monthlyUsdCents: 9_900,
    monthlyCredits: 120,
    highRes: true,
    postKit: true,
    allStudioModels: false,
    priority: true,
    mostPopular: true,
    storeProducts: 0,
    drops: false,
    features: [
      '120 videos every month',
      'Your posting calendar, planned and made for you',
      'Post Kit: a hook, caption and hashtags for every video',
      'Scroll-Stop Score and tips on every video',
      'Every trend theme',
      'Big 2K videos, made first',
    ],
  },
  brand_agency: {
    id: 'brand_agency',
    product: 'brand',
    name: 'Pro',
    tagline: 'Videos and posts for your whole team.',
    audience: 'For brokerages and teams',
    monthlyUsdCents: 19_900,
    monthlyCredits: 300,
    highRes: true,
    postKit: true,
    allStudioModels: false,
    priority: true,
    mostPopular: false,
    storeProducts: 0,
    drops: false,
    features: [
      '300 videos every month',
      'Everything in Growth',
      'Setup call with our team',
      'Priority support',
    ],
  },
  shop_starter: {
    id: 'shop_starter',
    product: 'shop',
    name: 'Starter',
    tagline: 'Videos for your new stock.',
    audience: 'For small shops',
    monthlyUsdCents: 4_900,
    monthlyCredits: 50,
    highRes: false,
    postKit: false,
    allStudioModels: false,
    priority: false,
    mostPopular: false,
    storeProducts: 50,
    drops: false,
    features: ['50 videos every month', 'Import up to 50 products from your store', 'TikTok listing packs', 'Scroll-Stop Score on every video', 'You or 1 Studio model'],
  },
  shop_pro: {
    id: 'shop_pro',
    product: 'shop',
    name: 'Growth',
    tagline: 'Your new drops, made every week.',
    audience: 'For shops with 100–500 products',
    monthlyUsdCents: 19_900,
    monthlyCredits: 240,
    highRes: true,
    postKit: true,
    allStudioModels: true,
    priority: true,
    mostPopular: true,
    storeProducts: 500,
    drops: true,
    features: [
      '240 videos every month',
      'Weekly drops: new products picked for you',
      'Store sync every week, up to 500 products',
      'Post Kit: hook, product description and hashtags',
      'All 30 Studio models, big 2K videos',
    ],
  },
  shop_scale: {
    id: 'shop_scale',
    product: 'shop',
    name: 'Scale',
    tagline: 'For big catalogs and fast restocks.',
    audience: 'For shops with 500+ products',
    monthlyUsdCents: 39_900,
    monthlyCredits: 600,
    highRes: true,
    postKit: true,
    allStudioModels: true,
    priority: true,
    mostPopular: false,
    storeProducts: 500,
    drops: true,
    features: [
      '600 videos every month',
      'Everything in Growth',
      'Videos made first',
      'First access to automatic TikTok Shop sync',
    ],
  },
};

export const TERMS: readonly TermMonths[] = [1, 12];

export const TERM_DISCOUNT: Record<TermMonths, number> = { 1: 0, 12: 0.1 };

/** Term shown by default on pricing and plan pickers. */
export const DEFAULT_TERM: TermMonths = 12;

/** "Monthly" / "Yearly"; any other stored length (older 3- or 6-month plans) reads "N months". */
export const termLabel = (months: number): string => (months === 1 ? 'Monthly' : months === 12 ? 'Yearly' : `${months} months`);

export type TopupId = 'topup_10' | 'topup_30' | 'topup_90';

export type Topup = { id: TopupId; credits: number; usdCents: number; validityMonths: number };

/** $1.50 per video. */
export const TOPUPS: Record<TopupId, Topup> = {
  topup_10: { id: 'topup_10', credits: 10, usdCents: 1_500, validityMonths: 12 },
  topup_30: { id: 'topup_30', credits: 30, usdCents: 4_500, validityMonths: 12 },
  topup_90: { id: 'topup_90', credits: 90, usdCents: 13_500, validityMonths: 12 },
};

export const isPlanId = (value: string): value is PlanId => value in PLANS;

export const isTopupId = (value: string): value is TopupId => value in TOPUPS;

export const isTermMonths = (value: number): value is TermMonths =>
  (TERMS as readonly number[]).includes(value);

/** Full price for a prepaid term, in cents. Yearly = the discounted monthly price, rounded to a whole dollar, × 12. */
export const getTermPriceUsdCents = (planId: PlanId, term: TermMonths): number => {
  const monthlyDollars = Math.round((PLANS[planId].monthlyUsdCents / 100) * (1 - TERM_DISCOUNT[term]));
  return monthlyDollars * term * 100;
};

/** What the customer saves versus paying month by month, in cents. */
export const getTermSavingsUsdCents = (planId: PlanId, term: TermMonths): number =>
  PLANS[planId].monthlyUsdCents * term - getTermPriceUsdCents(planId, term);

/** Effective monthly price for a term, in cents (rounded to the cent). */
export const getEffectiveMonthlyUsdCents = (planId: PlanId, term: TermMonths): number =>
  Math.round(getTermPriceUsdCents(planId, term) / term);

/** Price per video at the monthly rate, in cents (rounded to the cent). */
export const getPricePerVideoUsdCents = (planId: PlanId): number =>
  Math.round(PLANS[planId].monthlyUsdCents / PLANS[planId].monthlyCredits);

export const plansForProduct = (product: ProductLineId): readonly Plan[] =>
  Object.values(PLANS).filter((plan) => plan.product === product);

export const topupList = (): readonly Topup[] => Object.values(TOPUPS);
