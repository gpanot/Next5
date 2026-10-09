// Calendar ideas: free Blitz videos and bank slideshows planned on calendar days, kept or skipped by the user.
// Shared by the server (src/server/labs/calendarIdeas.ts) and the browser.

import type { DeckItem } from '../../server/slideshow/core/deckAssembly';
import type { ContentGoal } from './contentGoals';

/** `blitz`: a Blitz video (quick to make). `slideshow`: a real Auto Slideshow from the Slideshow Bank, made in the
 *  background while the user swipes (1-2 minutes). */
export type IdeaFormat = 'blitz' | 'slideshow';

/** `made`: kept and paid for; it is on the calendar as a post now, so it leaves the ideas list. */
export type IdeaStatus = 'proposed' | 'kept' | 'discarded' | 'made';

/** Another first line for a slideshow idea: a bank hook written for the same meat. */
export type IdeaHook = { id: string; text: string };

export type IdeaDto = {
  /** slideshow_variants id */
  id: string;
  format: IdeaFormat;
  status: IdeaStatus;
  plannedAt: string;
  hook: string;
  /** Blitz: the deck card (shots, audio, why panel). Null for slideshows. */
  card: DeckItem | null;
  /** Slideshow: goal, cover photo, slide titles. Blitz: other first lines (reserve cards of the same audience). */
  goal: ContentGoal | null;
  coverUrl: string | null;
  outline: string[];
  hooks: IdeaHook[];
  /** Slideshow: the real slideshow, made while the user swipes. `slides`: its rendered slides, once ready. */
  slideshow: { state: 'making' | 'ready'; slides: string[] } | null;
  /** Slideshow asked for with "Create 3 slideshows": leads the deck once ready. */
  requested?: boolean;
};

/** `reserve`: unused Blitz cards not on a day yet; a day's "+" (or a skipped idea) takes the next one.
 *  `batchSince`: when the batch being written started (ISO), e.g. the first one the server writes after the first run;
 *  null when none is. */
export type IdeasListDto = { ideas: IdeaDto[]; slideshowPct: number; reserve: number; batchSince: string | null };

/** POST /blitz/ideas/day: one more idea on a day ("+"), or the day's last idea back to the reserve ("−"). */
export type IdeaDayRequest = { action: 'add' | 'remove'; day: string; tzOffsetMin?: number };

/** POST /blitz/ideas/make → the slideshows made from kept slideshow ideas, and their days (to pin them there). */
export type MadeSlideshow = { ideaId: string; slideshowId: string; plannedAt: string };

/** "Create 3 slideshows" on the deck's menu: slideshow ideas asked for at once (paid only when kept). */
export const REQUESTED_SLIDESHOWS = 3;

/** Blitz ideas shown before the first slideshow idea, so it has time to be made (about 1-2 minutes). */
export const SLIDESHOW_AFTER = 8;

/** PATCH /blitz/ideas/[id] */
/** A Blitz idea's music (a library track; `url` plays in the browser). */
export type IdeaAudio = { assetKey: string; url: string; startAt: number; label: string };

export type IdeaPatch = { status?: Exclude<IdeaStatus, 'made'>; plannedAt?: string; hookId?: string; audio?: IdeaAudio };

/** Ideas in one batch, over the next IDEA_DAYS days: one post a day. */
export const IDEAS_PER_BATCH = 14;
export const IDEA_DAYS = 14;
/** Ideas planned on one day at most (the day keeps room for the user's own posts). */
export const IDEAS_PER_DAY = 3;

