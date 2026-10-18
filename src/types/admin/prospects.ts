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

/** One stored day: `refId` is the BlitzProject (blitz) or the AutoSlideshow (cast, hooks). `at`: ISO time. */
export type ProspectDay = { day: number; at: string; kind: ProspectKind; refId: string };

/** A picked Blitz idea and its render (null until queued). `retry`: it failed for a reason that may pass (the stock
 *  photo scraper was busy), so a later step tries it again; `tries` counts the attempts. */
export type ProspectBlitz = { ideaId: string; projectId: string | null; error?: string; retry?: boolean; tries?: number };

/** Attempts per Blitz idea before the pack goes on without it. */
export const PROSPECT_BLITZ_TRIES = 3;

/** True while a picked idea may still become a video. */
export const blitzPending = (b: ProspectBlitz): boolean => !b.projectId && (!b.error || (!!b.retry && (b.tries ?? 1) < PROSPECT_BLITZ_TRIES));

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

/** One day on the public page. */
export type ProspectViewDay = {
  day: number;
  at: string;
  kind: ProspectKind;
  title: string;
  /** Blitz: the rendered video. */
  videoUrl: string | null;
  /** Slideshows: the slide images in order. Blitz: its poster (first slide), when there is one. */
  slides: string[];
  caption: string;
};

/** GET /api/prospect/[token]. */
export type ProspectViewDto = { name: string; websiteUrl: string; status: 'ready' | 'claimed'; days: ProspectViewDay[] };

/** The share link's path for a pack. */
export const prospectPath = (shareToken: string): string => `/p/${shareToken}`;

/** The DM the admin sends with the link (3rd-grade words). */
export const prospectDm = (name: string, link: string): string =>
  `Hey! I made your next 14 days of posts for ${name}: TikTok, Instagram and more. Take a look: ${link}\nLike them? They are yours. Just tap "Get my posts".`;
