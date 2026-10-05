// What a calendar day shows, in the canvas design: one entry per post, video or idea, each with one status. Pure, so it
// is tested on its own (tests/components/calendarTiles.test.ts).

import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { ideaCover } from '../ideas/ideaCover';
import type { DayItem, PlanDay, PlanSlot } from './monthPlan';
import { coverIsVideoOf, coverOf, titleOf } from './slotBadge';

/** Idea: free, not kept yet. Kept: will be made on Make. Making: being made. Ready: waits for approval. Scheduled:
 *  approved (or posted). Failed: could not be made or posted. */
export type TileStatus = 'idea' | 'kept' | 'making' | 'ready' | 'scheduled' | 'failed';

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
};

/** Legend order and labels. */
export const STATUS_LABELS: Record<Exclude<TileStatus, 'failed'>, string> = { idea: 'Idea', kept: 'Kept', making: 'Making', ready: 'Ready', scheduled: 'Scheduled' };

export const statusOf = (item: DayItem): TileStatus | null => {
  if (item.kind === 'making') return 'making';
  if (item.kind === 'ready') return 'ready';
  if (item.kind === 'post') return item.post.status === 'canceled' ? null : item.post.status === 'failed' ? 'failed' : 'scheduled';
  const s = item.blitz.status;
  return s === 'canceled' ? null : s === 'failed' ? 'failed' : s === 'planned' ? 'ready' : s === 'rendering' ? 'making' : 'scheduled';
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
    return [{ id, status, at: slot.at, cover: coverOf(slot.item), coverIsVideo: coverIsVideoOf(slot.item), caption: titleOf(slot.item), captionOnCover: slot.item.kind === 'blitz', slot: slot as Filled, ...(status === 'making' && makingSince ? { makingSince } : {}) }];
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
