/** Prospect Packs (admin outbound): 14 days of content made for an SME before they sign up, shared at /p/<token>. */

export type ProspectStatus = 'building' | 'faces' | 'making' | 'ready' | 'failed' | 'claimed';

/** What one day of the pack posts: a Blitz video, a Brand Cast slideshow or a Hooks Volume slideshow. */
export type ProspectKind = 'blitz' | 'cast' | 'hooks';

/** The pack's mix: 7 Blitz videos, 3 Brand Cast slideshows, 4 Hooks Volume slideshows (one campaign). */
export const PROSPECT_BLITZ = 7;
export const PROSPECT_CAST = 3;
export const PROSPECT_HOOKS = 4;
export const PROSPECT_DAYS = PROSPECT_BLITZ + PROSPECT_CAST + PROSPECT_HOOKS;

/** Day order (day 1 first): videos every other day, the two slideshow kinds taking turns in between. */
export const PROSPECT_ORDER: ProspectKind[] = ['blitz', 'cast', 'blitz', 'hooks', 'blitz', 'cast', 'blitz', 'hooks', 'blitz', 'cast', 'blitz', 'hooks', 'blitz', 'hooks'];

/** Days of the pack the prospect gets free when they claim it (the rest are paid like any post). Only these are made in
 *  full; later days get a preview (see fullCount) until the pack is unlocked by a first payment. */
export const PROSPECT_FREE_DAYS = 7;

/** How many posts of a kind are made in full: the ones the free days show. The rest of that kind are previews. */
export const fullCount = (kind: ProspectKind): number => PROSPECT_ORDER.slice(0, PROSPECT_FREE_DAYS).filter((k) => k === kind).length;

/** One stored day: `refId` is the BlitzProject (blitz) or the AutoSlideshow (cast, hooks); for a Blitz preview, the
 *  idea. `preview`: only its first shot or slide is made. `at`: ISO time. */
export type ProspectDay = { day: number; at: string; kind: ProspectKind; refId: string; preview?: boolean };

/** A picked Blitz idea and its render (null until queued). `preview`: its photos are filled but it is not rendered
 *  until the pack is unlocked. `retry`: it failed for a reason that may pass (the stock photo scraper was busy), so a
 *  later step tries it again; `tries` counts the attempts. */
export type ProspectBlitz = { ideaId: string; projectId: string | null; preview?: boolean; error?: string; retry?: boolean; tries?: number };

/** Attempts per Blitz idea before the pack goes on without it. */
export const PROSPECT_BLITZ_TRIES = 3;

/** True while a picked idea may still become a video. */
export const blitzPending = (b: ProspectBlitz): boolean => !b.projectId && !(b.preview && !b.error) && (!b.error || (!!b.retry && (b.tries ?? 1) < PROSPECT_BLITZ_TRIES));

/** The admin list row. */
export type ProspectPackDto = {
  id: string;
  workspaceId: string;
  name: string;
  websiteUrl: string;
  status: ProspectStatus;
  shareToken: string;
  error: string | null;
  /** What each part has so far, for the progress line. */
  progress: { blitz: number; cast: number; hooks: number };
  costUsd: number;
  createdAt: string;
  claimedAt: string | null;
};

/** "Why this one?" in the post sheet: the same reasons the Ideas deck shows on a card (its whyPanel). */
export type ProspectWhy = { audience: string; hook: string; hookReason: string; story: Array<{ label: string; text: string }>; proof: string };

/** One day on the public page. */
export type ProspectViewDay = {
  day: number;
  at: string;
  kind: ProspectKind;
  title: string;
  /** Blitz: the rendered video. */
  videoUrl: string | null;
  /** Slideshows: the slide images in order. Blitz: none (its thumbnail is the video's first frame). */
  slides: string[];
  /** Blitz: the video's length in seconds, when known. */
  durationSec: number | null;
  caption: string;
  why: ProspectWhy | null;
  /** A day after the free ones: only its first slide or shot is shown, the rest comes after purchase. */
  locked: boolean;
};

/** GET /api/prospect/[token]. `heldUntil`: when the preview offer ends (7 days after the pack was made). */
export type ProspectViewDto = { name: string; websiteUrl: string; status: 'ready' | 'claimed'; heldUntil: string; heldEnded: boolean; days: ProspectViewDay[] };

/** How long a pack's preview is held for the prospect. */
export const PROSPECT_HOLD_DAYS = 7;

/** The share link's path for a pack. */
export const prospectPath = (shareToken: string): string => `/p/${shareToken}`;

/** The DM the admin sends with the link (3rd-grade words). */
export const prospectDm = (name: string, link: string): string =>
  `Hey! I made your next 14 days of posts for ${name}: TikTok, Instagram and more. Take a look: ${link}\nLike them? They are yours. Just tap "Get my posts".`;
