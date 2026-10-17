// What a calendar day shows, in the canvas design: one entry per post, video or idea, each with one status. Pure, so it
// is tested on its own (tests/components/calendarTiles.test.ts).

import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { ideaCover } from '../ideas/ideaCover';
import type { DayItem, PlanDay, PlanSlot } from './monthPlan';
import { coverIsVideoOf, coverOf, titleOf } from './slotBadge';

/** Idea: free, not kept yet. Kept: will be made on Make. Making: being made. Ready: waits for approval. Scheduled ("Approved"):
 *  approved, on its way out. Posted: live. Failed: could not be made or posted. */
export type TileStatus = 'idea' | 'kept' | 'making' | 'ready' | 'scheduled' | 'posted' | 'failed';

export type Filled = PlanSlot & { item: DayItem };

export type TileEntry = {
  id: string;
  status: TileStatus;
  at: Date;
  cover: string | null;
  coverIsVideo: boolean;
  caption: string;
  /** Write the caption over the cover: raw photos only (a rendered slide already shows its text). */
  captionOnCover: boolean;
  slot?: Filled;
  idea?: IdeaDto;
  /** Making: when the work began (the run's start), for the countdown on the tile. */
  makingSince?: string;
  /** Posting now: a countdown from when it was due (a video is made, then posted; a slideshow is only posted). */
  countdown?: PostCountdown;
};

export type PostCountdown = { since: string; totalMs: number; label: string };

/** A Blitz video made and posted right away: about 10 minutes. A slideshow (or campaign slideshow) posts in about 3. */
export const VIDEO_POST_MS = 10 * 60_000;
export const SLIDESHOW_POST_MS = 3 * 60_000;
const BLITZ_WORKING = ['rendering', 'sending', 'processing'];

/**
 * The countdown of a post going out now, or undefined. A video made ahead of its day (an hour before) shows none: it
 * waits for its time. Counted from its time, which "Post now" sets to the moment it was approved.
 */
export const countdownOfItem = (item: DayItem, now = Date.now()): PostCountdown | undefined => {
  if (item.kind === 'blitz') {
    const due = new Date(item.blitz.scheduledAt).getTime() <= now + 60_000;
    return BLITZ_WORKING.includes(item.blitz.status) && due ? { since: item.blitz.scheduledAt, totalMs: VIDEO_POST_MS, label: 'Making and posting' } : undefined;
  }
  if (item.kind === 'post' && (item.post.status === 'sending' || item.post.status === 'processing')) return { since: item.post.scheduledAt, totalMs: SLIDESHOW_POST_MS, label: 'Posting' };
  return undefined;
};

/** Legend order and labels. */
export const STATUS_LABELS: Record<Exclude<TileStatus, 'failed'>, string> = { idea: 'Idea', kept: 'Kept', making: 'Making', ready: 'To approve', scheduled: 'Approved', posted: 'Posted' };

export const statusOf = (item: DayItem): TileStatus | null => {
  if (item.kind === 'making') return 'making';
  if (item.kind === 'ready') return 'ready';
  if (item.kind === 'post') return item.post.status === 'canceled' ? null : item.post.status === 'failed' ? 'failed' : item.post.status === 'posted' ? 'posted' : 'scheduled';
  const s = item.blitz.status;
  return s === 'canceled' ? null : s === 'failed' ? 'failed' : s === 'planned' ? 'ready' : s === 'rendering' ? 'making' : s === 'posted' ? 'posted' : 'scheduled';
};

/**
 * The day's posts and kept ideas, by time. Waiting ideas live in the deck only (they get a day when kept), and skipped
 * ideas and canceled posts are left out.
 */
export const entriesOf = (day: PlanDay, ideas: IdeaDto[], makingSince?: string): TileEntry[] => {
  const posts = day.slots.flatMap((slot): TileEntry[] => {
    const status = slot.item ? statusOf(slot.item) : null;
    if (!slot.item || !status) return [];
    const id = slot.item.kind === 'blitz' ? slot.item.blitz.id : slot.item.show?.id ?? `making-${slot.at.toISOString()}`;
    return [{ id, status, at: slot.at, cover: coverOf(slot.item), coverIsVideo: coverIsVideoOf(slot.item), caption: titleOf(slot.item), captionOnCover: slot.item.kind === 'blitz', slot: slot as Filled, ...(status === 'making' && makingSince ? { makingSince } : {}), countdown: countdownOfItem(slot.item) }];
  });
  const planned = day.past ? [] : ideas.filter((i) => i.status === 'kept').map((idea): TileEntry => ({
    // A kept idea is already finished (videos render near their time, slideshows were made while swiping): it reads
    // as a ready post at once, while it is saved onto the calendar behind the scenes.
    id: idea.id, status: 'ready', at: new Date(idea.plannedAt), cover: ideaCover(idea)?.url ?? null, coverIsVideo: ideaCover(idea)?.video ?? false, caption: idea.hook, captionOnCover: idea.slideshow?.state !== 'ready', idea,
  }));
  return [...posts, ...planned].sort((a, b) => a.at.getTime() - b.at.getTime());
};

/** Slots the user asked for that nothing fills yet ("Generate" makes them). */
export const openSlots = (day: PlanDay): number => (day.past ? 0 : day.slots.filter((s) => s.item === null).length);
