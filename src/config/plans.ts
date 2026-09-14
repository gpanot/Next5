/**
 * Plans, prepaid terms and top-ups for Next5 Brand + Next5 Shop.
 * Spec: docs/business-studios/01-product-spec.md §4.
 *
 * Launch defaults — change prices here and every page, checkout and email follows.
 * Pure data + pure functions: safe to import from client and server.
 */

export type ProductLineId = 'brand' | 'shop';

export type PlanId = 'brand_starter' | 'brand_pro' | 'shop_starter' | 'shop_pro';

export type TermMonths = 1 | 3 | 6;

export type Plan = {
  id: PlanId;
  product: ProductLineId;
  name: string;
  tagline: string;
  monthlyUsdCents: number;
  monthlyCredits: number;
  maxSets: number;
  highRes: boolean;
  captions: boolean;
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
    tagline: 'Fresh photos for your weekly posts.',
    monthlyUsdCents: 1_900,
    monthlyCredits: 30,
    maxSets: 2,
    highRes: false,
    captions: false,
    allStudioModels: false,
    priority: false,
    mostPopular: false,
    features: ['30 photos every month', '2 sets', 'Every monthly theme', 'All social formats'],
  },
  brand_pro: {
    id: 'brand_pro',
    product: 'brand',
    name: 'Pro',
    tagline: 'For people who post every day.',
    monthlyUsdCents: 4_900,
    monthlyCredits: 90,
    maxSets: 5,
    highRes: true,
    captions: true,
    allStudioModels: false,
    priority: true,
    mostPopular: true,
    features: [
      '90 photos every month',
      '5 sets',
      'Big 2K photos',
      'Captions ready to post',
      'Get new themes first',
    ],
  },
  shop_starter: {
    id: 'shop_starter',
    product: 'shop',
    name: 'Starter',
    tagline: 'Photos for all your new stock.',
    monthlyUsdCents: 1_500,
    monthlyCredits: 50,
    maxSets: 2,
    highRes: false,
    captions: false,
    allStudioModels: false,
    priority: false,
    mostPopular: false,
    features: ['50 photos every month', '2 shop looks', 'You or 1 Studio model', 'Every shop size'],
  },
  shop_pro: {
    id: 'shop_pro',
    product: 'shop',
    name: 'Pro',
    tagline: 'For shops with new stock every week.',
    monthlyUsdCents: 3_900,
    monthlyCredits: 150,
    maxSets: 5,
    highRes: true,
    captions: false,
    allStudioModels: true,
    priority: true,
    mostPopular: true,
    features: [
      '150 photos every month',
      '5 shop looks',
      'All 6 Studio models',
      'Big 2K photos',
      'Your photos made first',
    ],
  },
};

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
