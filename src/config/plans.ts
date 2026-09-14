/**
 * Plans, prepaid terms and top-ups for Next5 Brand + Next5 Shop.
 * Spec: docs/business-studios/01-product-spec.md §4.
 *
 * Launch defaults — change prices here and every page, checkout and email follows.
 * Pure data + pure functions: safe to import from client and server.
 */

export type ProductLineId = 'brand' | 'shop';

export type PlanId = 'brand_starter' | 'brand_pro' | 'brand_agency' | 'shop_starter' | 'shop_pro' | 'shop_agency';

export type TermMonths = 1 | 3 | 6;

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
  maxSets: number;
  highRes: boolean;
  /** Post Kit: hook, caption, hashtags (and a product description on Shop) for every photo. */
  postKit: boolean;
  allStudioModels: boolean;
  priority: boolean;
  mostPopular: boolean;
  features: readonly string[];
};

export const PLANS: Record<PlanId, Plan> = {
  brand_starter: {
    id: 'brand_starter',
    product: 'brand',
    name: 'Starter',
    tagline: 'New photos of you for your weekly posts.',
    audience: 'To get started',
    monthlyUsdCents: 2_900,
    monthlyCredits: 30,
    maxSets: 2,
    highRes: false,
    postKit: false,
    allStudioModels: false,
    priority: false,
    mostPopular: false,
    features: ['30 photos every month', 'Scroll-Stop Score on every photo', '2 sets', 'Every monthly trend theme', 'All social sizes'],
  },
  brand_pro: {
    id: 'brand_pro',
    product: 'brand',
    name: 'Growth',
    tagline: 'Your whole month of posts, done.',
    audience: 'For solo pros who want to grow',
    monthlyUsdCents: 9_900,
    monthlyCredits: 120,
    maxSets: 5,
    highRes: true,
    postKit: true,
    allStudioModels: false,
    priority: true,
    mostPopular: true,
    features: [
      '120 photos every month',
      'Post Kit: a hook, caption and hashtags for every photo',
      'Scroll-Stop Score and tips on every photo',
      '5 sets and every trend theme',
      'Big 2K photos, made first',
    ],
  },
  brand_agency: {
    id: 'brand_agency',
    product: 'brand',
    name: 'Agency',
    tagline: 'Photos and posts for your whole team.',
    audience: 'For brokerages and teams',
    monthlyUsdCents: 75_900,
    monthlyCredits: 1_200,
    maxSets: 30,
    highRes: true,
    postKit: true,
    allStudioModels: false,
    priority: true,
    mostPopular: false,
    features: [
      '1,200 photos every month',
      'Everything in Growth',
      '30 sets for your team and brands',
      'Setup call with our team',
      'Priority support',
    ],
  },
  shop_starter: {
    id: 'shop_starter',
    product: 'shop',
    name: 'Starter',
    tagline: 'Photos for your new stock.',
    audience: 'To get started',
    monthlyUsdCents: 2_900,
    monthlyCredits: 60,
    maxSets: 2,
    highRes: false,
    postKit: false,
    allStudioModels: false,
    priority: false,
    mostPopular: false,
    features: ['60 photos every month', 'Scroll-Stop Score on every photo', '2 shop looks', 'You or 1 Studio model', 'Every shop size'],
  },
  shop_pro: {
    id: 'shop_pro',
    product: 'shop',
    name: 'Growth',
    tagline: 'Photos and listings that sell.',
    audience: 'For shops that want more sales',
    monthlyUsdCents: 9_900,
    monthlyCredits: 300,
    maxSets: 5,
    highRes: true,
    postKit: true,
    allStudioModels: true,
    priority: true,
    mostPopular: true,
    features: [
      '300 photos every month',
      'Post Kit: a hook, product description and hashtags for every photo',
      'Scroll-Stop Score and tips on every photo',
      'All 6 Studio models and 5 shop looks',
      'Big 2K photos, made first',
    ],
  },
  shop_agency: {
    id: 'shop_agency',
    product: 'shop',
    name: 'Agency',
    tagline: 'For agencies that run many shops.',
    audience: 'For TikTok Shop agencies',
    monthlyUsdCents: 75_900,
    monthlyCredits: 3_000,
    maxSets: 30,
    highRes: true,
    postKit: true,
    allStudioModels: true,
    priority: true,
    mostPopular: false,
    features: [
      '3,000 photos every month',
      'Everything in Growth',
      '30 shop looks for all your brands',
      'Setup call with our team',
      'Priority support',
    ],
  },
};

/** Plans a solo buyer is shown during onboarding (Agency is offered on pricing and billing). */
export const isSoloPlan = (plan: Plan): boolean => !plan.id.endsWith('_agency');

export const TERMS: readonly TermMonths[] = [1, 3, 6];

export const TERM_DISCOUNT: Record<TermMonths, number> = { 1: 0, 3: 0.1, 6: 0.2 };

export type TopupId = 'topup_20' | 'topup_60' | 'topup_150';

export type Topup = { id: TopupId; credits: number; usdCents: number; validityMonths: number };

export const TOPUPS: Record<TopupId, Topup> = {
  topup_20: { id: 'topup_20', credits: 20, usdCents: 600, validityMonths: 12 },
  topup_60: { id: 'topup_60', credits: 60, usdCents: 1_500, validityMonths: 12 },
  topup_150: { id: 'topup_150', credits: 150, usdCents: 3_200, validityMonths: 12 },
};

/** Credits a trial or no-plan workspace may hold sets for. */
export const NO_PLAN_MAX_SETS = 1;

export const isPlanId = (value: string): value is PlanId => value in PLANS;

export const isTopupId = (value: string): value is TopupId => value in TOPUPS;

export const isTermMonths = (value: number): value is TermMonths =>
  (TERMS as readonly number[]).includes(value);

/** Full price for a prepaid term, rounded to the nearest whole dollar, in cents. */
export const getTermPriceUsdCents = (planId: PlanId, term: TermMonths): number => {
  const plan = PLANS[planId];
  const dollars = (plan.monthlyUsdCents / 100) * term * (1 - TERM_DISCOUNT[term]);
  return Math.round(dollars) * 100;
};

/** What the customer saves versus paying month by month, in cents. */
export const getTermSavingsUsdCents = (planId: PlanId, term: TermMonths): number =>
  PLANS[planId].monthlyUsdCents * term - getTermPriceUsdCents(planId, term);

/** Effective monthly price for a term, in cents (rounded to the cent). */
export const getEffectiveMonthlyUsdCents = (planId: PlanId, term: TermMonths): number =>
  Math.round(getTermPriceUsdCents(planId, term) / term);

/** Price per photo at the monthly rate, in cents (rounded to the cent). */
export const getPricePerPhotoUsdCents = (planId: PlanId): number =>
  Math.round(PLANS[planId].monthlyUsdCents / PLANS[planId].monthlyCredits);

export const plansForProduct = (product: ProductLineId): readonly Plan[] =>
  Object.values(PLANS).filter((plan) => plan.product === product);

export const topupList = (): readonly Topup[] => Object.values(TOPUPS);
