/** Client-safe calendar DTOs returned by /api/app/calendar. */

import type { PostKitDto, ScoreDetailsDto } from './batches';

export type SlotStatusDto = 'planned' | 'posted' | 'skipped';
export type SlotOfDayDto = 'morning' | 'midday' | 'evening';
export type PlatformDto = 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'other';

export type SlotDto = {
  id: string;
  /** `YYYY-MM-DD`. */
  scheduledFor: string;
  slotOfDay: SlotOfDayDto;
  status: SlotStatusDto;
  platform: PlatformDto;
  postUrl: string | null;
  postedAt: string | null;
  /** What she uploaded this from, e.g. "24 Oak St". */
  materialLabel: string | null;
  photo: {
    itemId: string;
    batchId: string;
    /** The batch it came from, e.g. "Just Listed" — the card's label when there is no Post Kit. */
    batchName: string;
    url: string | null;
    postKit: PostKitDto | null;
    score: number | null;
    scoreDetails: ScoreDetailsDto | null;
  } | null;
};

export type ScheduleDto = {
  active: boolean;
  weekdays: number[];
  timezone: string;
  autoFill: boolean;
  autopilot: boolean;
  weeklyDigest: boolean;
  platform: PlatformDto;
  icsUrl: string;
  /** Autopilot stopped itself because nothing has been posted lately. */
  paused: boolean;
};

export type CalendarDto = {
  schedule: ScheduleDto;
  slots: SlotDto[];
  /** Posts marked done in the rolling 30 days, and the number the promise asks for. */
  progress: { posted: number; planned: number; required: number };
  /** Growth writes the caption; Starter sees the photo and the tip. */
  postKitAllowed: boolean;
};
