// server-only — never import from a 'use client' file.

import type { PostSchedule } from '@prisma/client';
import { PROMISE } from '../../config/promise';
import type { PostKitDto, ScoreDetailsDto } from '../../types/business/batches';
import type { CalendarDto, PlatformDto, ScheduleDto, SlotDto, SlotOfDayDto, SlotStatusDto } from '../../types/business/calendar';
import { presignObject } from '../storage/objectStore';
import type { SlotWithItem } from './calendar';
import { isoDate } from './schedule';

export const toSlotDto = async (slot: SlotWithItem): Promise<SlotDto> => ({
  id: slot.id,
  scheduledFor: isoDate(slot.scheduledFor),
  slotOfDay: slot.slotOfDay as SlotOfDayDto,
  status: slot.status as SlotStatusDto,
  platform: slot.platform as PlatformDto,
  postUrl: slot.postUrl,
  postedAt: slot.postedAt?.toISOString() ?? null,
  materialLabel: slot.material?.label ?? null,
  photo: slot.item
    ? {
        itemId: slot.item.id,
        batchId: slot.item.batchId,
        batchName: slot.item.batch.name,
        url: slot.item.r2Key ? await presignObject(slot.item.r2Key) : null,
        postKit: (slot.item.postKit as PostKitDto | null) ?? null,
        score: slot.item.score,
        scoreDetails: (slot.item.scoreDetails as ScoreDetailsDto | null) ?? null,
      }
    : null,
});

export const toScheduleDto = (schedule: PostSchedule, platform: PlatformDto, baseUrl: string): ScheduleDto => ({
  active: schedule.active,
  weekdays: schedule.weekdays,
  timezone: schedule.timezone,
  autoFill: schedule.autoFill,
  autopilot: schedule.autopilot,
  weeklyDigest: schedule.weeklyDigest,
  platform,
  icsUrl: `${baseUrl}/api/app/calendar/ics/${schedule.icsToken}`,
  paused: Boolean(schedule.pausedAt),
});

export const toCalendarDto = async (
  schedule: PostSchedule,
  slots: SlotWithItem[],
  posted: number,
  postKitAllowed: boolean,
  baseUrl: string,
): Promise<CalendarDto> => ({
  schedule: toScheduleDto(schedule, (slots.find((s) => s.status === 'planned')?.platform ?? 'instagram') as PlatformDto, baseUrl),
  slots: await Promise.all(slots.map(toSlotDto)),
  progress: { posted, planned: slots.filter((s) => s.status === 'planned').length, required: PROMISE.postsRequired },
  postKitAllowed,
});
