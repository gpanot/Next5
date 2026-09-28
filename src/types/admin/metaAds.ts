/**
 * "Perfect Ads" admin lab — client-safe types shared by the API routes and the admin UI.
 * Pipeline: 1 profile (Exa) → 2 competitor ads (treg) → 3 Hormozi picks → 4 copy (OpenAI) → 5 images (reAPI) → 6 composite.
 */

export type PipelineStep = 1 | 2 | 3 | 4 | 5 | 6;

export type MetaAdRunStatus = `STEP_${PipelineStep}_RUNNING` | 'COMPLETED' | 'FAILED';

export type MetaAdStatus = 'pending' | 'imaging' | 'compositing' | 'ready' | 'failed';

export const META_ADS_PER_RUN = 15;

/** Smaller runs offered from the "Get 500 / month" demo button. */
export const DEMO_AD_COUNTS = [1, 2, 5] as const;

export const isAdCount = (value: unknown): value is number =>
  value === META_ADS_PER_RUN || (DEMO_AD_COUNTS as readonly unknown[]).includes(value);

/** Step 1 checkpoint. */
export type BrandProfile = {
  brandName: string;
  domain: string;
  valueProp: string;
  audience: string;
  tone: string;
  productCategories: string[];
  /** Plain words to search the Meta Ad Library with (category words, not the brand name). */
  searchKeywords: string[];
  /** Hex colors read from the site's CSS (brand colors first). Empty when the site has none. */
  palette: string[];
  heroImageUrl: string | null;
  faviconUrl: string | null;
  pageTitle: string | null;
  /** First part of the page text, so later steps can quote real facts. */
  pageExcerpt: string;
};

/** What the advertiser's own behaviour says about one creative (computed, not judged). */
export type WinnerEvidence = {
  winnerScore: number;
  /** Still running, old enough, and it outlived the kill window or was duplicated. */
  proven: boolean;
  ageDays: number;
  /** Ads running this same creative (same advertiser, same text). */
  copies: number;
  /** Median life of the advertiser's stopped ads; null when too few to measure. */
  killMedianDays: number | null;
  /** Age ÷ (2 × kill window). 1+ = outlived it. */
  survival: number;
  /** 1 = first in the advertiser's impression-sorted list; null when unknown. */
  reach: number | null;
  /** Plain-English lines, e.g. "Outlived their usual 7-day test 3×". */
  reasons: string[];
};

export type CompetitorAd = {
  id: string;
  pageId: string;
  pageName: string;
  isActive: boolean;
  /** ISO date the ad started. */
  startDate: string;
  body: string;
  title: string;
  cta: string;
  format: string;
  imageUrl: string | null;
  daysRunning: number;
  /** Ads Meta groups under this creative (the advertiser duplicated it to scale). 1 when unknown. */
  variants?: number;
  libraryUrl: string;
  /** Search keyword that found it, or "page" when it came from the advertiser's page. */
  keyword: string;
  evidence?: WinnerEvidence;
  /** The brand's own ad. */
  own?: boolean;
};

export type AdvertiserSummary = {
  pageId: string;
  pageName: string;
  active: number;
  stopped: number;
  killMedianDays: number | null;
  own: boolean;
};

/** Step 2 checkpoint. */
export type CompetitorResearch = {
  keywords: string[];
  ads: CompetitorAd[];
  /** What the kept competitor ads have in common — drawn from those ads only. */
  patterns: string[];
  /** Ads the search returned before the relevance filter. */
  candidateCount: number;
  brandCount: number;
  /** Advertisers whose full ad history was read (active + stopped), the brand's own page included. */
  advertisers: AdvertiserSummary[];
  /** The brand's own creatives, with the same evidence. */
  ownAds: CompetitorAd[];
  ownPageId: string | null;
  stats: {
    avgPrimaryTextChars: number;
    formats: Record<string, number>;
    topCtas: string[];
    maxDaysRunning: number;
  };
};

/**
 * The rubric (Alex Hormozi, $100M Offers / $100M Leads). The value equation's four levers, then how the ad
 * hooks, proves, offers and asks.
 */
export const HORMOZI_CRITERIA = ['dreamOutcome', 'likelihood', 'timeDelay', 'effort', 'callout', 'proof', 'offer', 'cta'] as const;
export type HormoziCriterion = (typeof HORMOZI_CRITERIA)[number];

export const CRITERION_LABELS: Record<HormoziCriterion, string> = {
  dreamOutcome: 'Dream outcome',
  likelihood: 'Likelihood',
  timeDelay: 'Speed',
  effort: 'Low effort',
  callout: 'Callout',
  proof: 'Proof',
  offer: 'Offer',
  cta: 'CTA',
};

/** 0-3. Any score above 0 needs a quote that the code found word for word in the ad. */
export type CriterionScore = { score: number; quote: string | null };

export const CREATIVE_ARCHETYPES = ['ugc_photo', 'product_shot', 'lifestyle', 'price_card', 'comparison', 'testimonial_card', 'meme', 'screenshot', 'collage', 'other'] as const;
export type CreativeArchetype = (typeof CREATIVE_ARCHETYPES)[number];

export const ARCHETYPE_LABELS: Record<CreativeArchetype, string> = {
  ugc_photo: 'UGC photo',
  product_shot: 'Product shot',
  lifestyle: 'Lifestyle',
  price_card: 'Price / offer card',
  comparison: 'Comparison',
  testimonial_card: 'Testimonial card',
  meme: 'Meme',
  screenshot: 'Screenshot',
  collage: 'Collage',
  other: 'Other',
};

/** What a vision model sees in an image ad. Facts first; the two judged scores are read twice. */
export type CreativeRead = {
  archetype: CreativeArchetype;
  /** Every word printed on the image. */
  onImageText: string;
  subject: string;
  hasPerson: boolean;
  productVisible: boolean;
  /** Computed from onImageText: a price, %, "free" or "off". */
  offerOnImage: boolean;
  thumbStop: { score: number; because: string };
  clarity: { score: number; because: string };
  /** The two reads disagreed by more than one point on a judged score. */
  unstable: boolean;
  visualScore: number;
};

export type AdRating = {
  adId: string;
  own: boolean;
  /** Copy rubric, graded twice: each criterion keeps only a verified, stable score. */
  scores: Record<HormoziCriterion, CriterionScore>;
  /** Criteria where the two gradings disagreed by more than one point (scored at the lower one). */
  unstable: HormoziCriterion[];
  /** Quotes the model claimed but the ad does not contain — zeroed, kept for audit. */
  rejectedQuotes: number;
  copyScore: number;
  creative: CreativeRead | null;
  /** Copy and image combined (config CRAFT_WEIGHTS). Explains and tie-breaks; never picks. */
  craftScore: number;
  /** From the advertiser's own behaviour (config WINNER_WEIGHTS). Picks. */
  winnerScore: number;
  proven: boolean;
};

/** A value-equation claim the brand can make, with the site sentence that proves it. */
export type BrandLever = { id: string; criterion: HormoziCriterion; claim: string; quote: string };

export type HormoziPick = {
  adId: string;
  /** The brand's own ad (its proven winner), not a competitor's. */
  own: boolean;
  /** False when no ad in the study passed the proven-winner rule: the best available, flagged as such. */
  proven: boolean;
  why: string;
  /** Reusable structure with [PLACEHOLDERS]. */
  stealThis: string;
  /** What Hormozi would fix: the weakest criteria. */
  fix: string;
};

export type Play = { name: string; structure: string; fromAdId: string; leverId: string; example: string; /** Visual format of the pick it came from. */ archetype: CreativeArchetype | null };

/** Step 3 checkpoint. */
export type ScoringReport = {
  version: string;
  /** Spearman correlation between craft and winner score over the graded ads: does the rubric agree with the market? */
  agreement: { rho: number | null; n: number };
  provenCount: number;
};

export type HormoziResult = {
  scoring: ScoringReport;
  ratings: AdRating[];
  levers: BrandLever[];
  picks: HormoziPick[];
  plays: Play[];
};

export type AdCopy = {
  angle: string;
  /** Visual style, e.g. "UGC selfie", "Product hero", "Bold text". */
  style: string;
  headline: string;
  primaryText: string;
  primaryTextAlt: string;
  /** Short text burned onto the image. */
  overlayText: string;
  imagePrompt: string;
  /** Playbook play name the ad is built on. */
  play: string;
  /** Competitor ad the play came from. */
  inspiredByAdId: string | null;
};

/** Step 4 checkpoint. */
export type CopyPlan = { ads: AdCopy[] };

export type CostItem = { label: string; usdMicros: number };
export type StepCost = { usdMicros: number; items: CostItem[] };

export type MetaAdDto = AdCopy & {
  id: string;
  position: number;
  status: MetaAdStatus;
  rawImageUrl: string | null;
  finalUrl: string | null;
  error: string | null;
};

export type MetaAdRunDto = {
  id: string;
  url: string;
  adCount: number;
  status: MetaAdRunStatus;
  profile: BrandProfile | null;
  competitors: CompetitorResearch | null;
  hormozi: HormoziResult | null;
  copy: CopyPlan | null;
  stepTimings: Partial<Record<PipelineStep, number>>;
  stepCosts: Partial<Record<PipelineStep, StepCost>>;
  totalCostMicros: number;
  failedStep: number | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  ads: MetaAdDto[];
};

export type MetaAdRunSummary = {
  id: string;
  url: string;
  status: MetaAdRunStatus;
  brandName: string | null;
  readyCount: number;
  totalCostMicros: number;
  createdAt: string;
};

export const DONE_STEP = 7;

export const isTerminalStatus = (status: MetaAdRunStatus): boolean => status === 'COMPLETED' || status === 'FAILED';

/** Which step a run is on (7 = done, 0 = failed). */
export const currentStep = (status: MetaAdRunStatus): number =>
  status === 'COMPLETED' ? DONE_STEP : status === 'FAILED' ? 0 : Number(status.charAt(5));

export const formatUsd = (micros: number): string =>
  micros === 0 ? '$0' : micros < 10_000 ? `$${(micros / 1_000_000).toFixed(4)}` : `$${(micros / 1_000_000).toFixed(3)}`;
