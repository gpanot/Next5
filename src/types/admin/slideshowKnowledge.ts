/**
 * Slideshow Knowledge Center — client-safe types shared by the API routes and the admin UI.
 * Proven TikTok photo slideshows are imported (links, a creator's most popular posts, or a keyword search), their
 * slides are read, and each post becomes an example of a reusable model: hook pattern + meat pattern + CTA pattern.
 */

export const SLIDE_ROLES = ['hook', 'item', 'cta', 'other'] as const;
export type SlideRole = (typeof SLIDE_ROLES)[number];

export const SLIDESHOW_FORMATS = ['listicle', 'myth_truth', 'story', 'steps', 'before_after', 'comparison', 'other'] as const;
export type SlideshowFormat = (typeof SLIDESHOW_FORMATS)[number];

export const FORMAT_LABELS: Record<SlideshowFormat, string> = {
  listicle: 'Listicle',
  myth_truth: 'Myth vs truth',
  story: 'Story',
  steps: 'Steps',
  before_after: 'Before / after',
  comparison: 'Comparison',
  other: 'Other',
};

/** Same six hook types as the slideshow engine (src/server/slideshow/core/types.ts). */
export const HOOK_ARCHETYPES = ['call_out', 'contrarian', 'proof_result', 'fear_inaction', 'curiosity', 'action'] as const;
export type HookArchetype = (typeof HOOK_ARCHETYPES)[number];

/** One slide of an imported post, as read by the vision model. */
export type ReferenceSlide = {
  index: number;
  /** Object-store key of the saved slide image. */
  imageKey: string;
  width: number;
  height: number;
  role: SlideRole;
  /** Headline text (boxed or biggest text), "" when none. */
  title: string;
  /** Smaller text under the headline, "" when none. */
  body: string;
  /** How the text is drawn, e.g. "white text, black outline, centered". */
  textStyle: string;
  /** What the photo shows, e.g. "vintage golfer mid-swing, film look". */
  photo: string;
};

export type ReferenceStats = { views: number; likes: number; saves: number; shares: number; comments: number };

export const REFERENCE_STATUSES = ['pending', 'reading', 'ready', 'failed'] as const;
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];

/** The reusable part of a slideshow: structure, not the creator's words. */
export type SlideshowPattern = {
  format: SlideshowFormat;
  /** Hook with [slots], e.g. "[N] [niche] cheat codes". */
  hookPattern: string;
  /** Other proven hooks on the same structure, added as more examples join ("[N] [niche] Tips Nobody Tells [audience]"). */
  hookVariants: string[];
  hookArchetype: HookArchetype;
  /** Meat slides between hook and CTA. */
  itemCount: number;
  /** One meat slide, e.g. "Bold imperative title (3-6 words) + one plain line with a concrete number". */
  itemPattern: string;
  /** CTA with [slots], e.g. "Download \"[App]\" from the App Store + [proof line]". */
  ctaPattern: string;
  /** Visual rules to copy: text style, photo style, what never appears. */
  visualRules: string[];
  /** Caption habit, e.g. "5 niche hashtags, no text". */
  captionStyle: string;
  /** Why it works, in plain words. */
  whyItWorks: string;
};

export const MODEL_STATUSES = ['draft', 'approved', 'archived'] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];

export type SlideDto = ReferenceSlide & { imageUrl: string | null };

export type ReferenceDto = {
  id: string;
  modelId: string | null;
  sourceUrl: string;
  postId: string;
  creator: string;
  caption: string;
  stats: ReferenceStats;
  postedAt: string | null;
  slides: SlideDto[];
  status: ReferenceStatus;
  error: string | null;
  costMicros: number;
  createdAt: string;
};

export type ModelSummaryDto = {
  id: string;
  name: string;
  niches: string[];
  status: ModelStatus;
  pattern: SlideshowPattern;
  examples: number;
  totalViews: number;
  /** Saves per 1,000 views across the examples: the best signal for slideshows. */
  savesPerMille: number;
  coverUrl: string | null;
  updatedAt: string;
};

export type ModelDetailDto = ModelSummaryDto & { references: ReferenceDto[] };

/** A post found by a creator or keyword search, not saved yet. */
export type CandidateDto = {
  postId: string;
  url: string;
  creator: string;
  caption: string;
  coverUrl: string | null;
  slideCount: number;
  stats: ReferenceStats;
  postedAt: string | null;
  /** Already in the Knowledge Center. */
  imported: boolean;
};

export const CANDIDATE_SOURCES = ['creator', 'keyword'] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

/** Import at most this many posts in one request. */
export const MAX_IMPORT = 30;

export const isBusy = (status: ReferenceStatus) => status === 'pending' || status === 'reading';
