// server-only — never import from a 'use client' file.
// The Brand Studio calendar: her cadence, her dated posts, and the counter behind the promise.
// Plan: docs/business-studios/11-calendar-plan.md.

import { randomBytes } from 'node:crypto';
import { Prisma, type PostSchedule, type PostSlot, type Workspace } from '@prisma/client';
import { PROMISE } from '../../config/promise';
import { prisma } from '../../lib/db';
import type { ScoreDetails } from '../../lib/scoreRubric';
import { HttpError } from '../http';
import { isValidWeekdays, isoDate, nextSlotDates, placeItems, startOfDay, windowStart, type PlaceableItem } from './schedule';

export const DEFAULT_WEEKDAYS = [2, 4, 6];
/**
 * A slot she took a photo off stays as `removed`, so auto-fill never books that photo again.
 * Skipped is the older, softer state. Neither counts as on the calendar.
 */
export const OFF_CALENDAR = ['skipped', 'removed'];
export const isOnCalendar = (status: string): boolean => !OFF_CALENDAR.includes(status);
const MAX_PHOTOS_PER_ADD = 30;
/** How much of the future we ever show or fill at once. */
const HORIZON_SLOTS = 60;
const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'linkedin', 'other'] as const;
export type Platform = (typeof PLATFORMS)[number];

export type ScheduleInput = {
  active: boolean;
  weekdays: number[];
  timezone: string;
  autoFill: boolean;
  autopilot: boolean;
  weeklyDigest: boolean;
  platform: Platform;
};

const brandOnly = (ws: Workspace): void => {
  if (ws.product !== 'brand') throw new HttpError(400, 'wrong_product', 'The calendar is part of Brand Studio.');
};

/**
 * Her schedule, created with sensible defaults the first time she opens the calendar.
 * Create-and-catch rather than upsert: several photos of one batch finish at once and each
 * asks for the schedule, but an upsert's update path would touch `updatedAt` — which is the
 * very thing `enableAfterFirstBatch` reads to tell a default schedule from one she has changed.
 */
export const getOrCreateSchedule = async (ws: Workspace): Promise<PostSchedule> => {
  brandOnly(ws);
  const existing = await prisma.postSchedule.findUnique({ where: { workspaceId: ws.id } });
  if (existing) return existing;
  try {
    return await prisma.postSchedule.create({
      data: { workspaceId: ws.id, weekdays: DEFAULT_WEEKDAYS, icsToken: randomBytes(24).toString('base64url') },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return prisma.postSchedule.findUniqueOrThrow({ where: { workspaceId: ws.id } });
    }
    throw err;
  }
};

export const parseScheduleInput = (body: Record<string, unknown>): ScheduleInput => {
  const weekdays = [...new Set((Array.isArray(body.weekdays) ? body.weekdays : []).map(Number))].sort((a, b) => a - b);
  if (!isValidWeekdays(weekdays)) throw new HttpError(400, 'invalid_weekdays', 'Pick at least one day to post.');
  const platform = String(body.platform ?? 'instagram') as Platform;
  if (!PLATFORMS.includes(platform)) throw new HttpError(400, 'invalid_platform', 'Pick where you post.');
  const timezone = String(body.timezone ?? 'UTC').slice(0, 64) || 'UTC';
  return {
    active: body.active !== false,
    weekdays,
    timezone,
    autoFill: body.autoFill !== false,
    autopilot: body.autopilot === true,
    weeklyDigest: body.weeklyDigest !== false,
    platform,
  };
};

export const saveSchedule = async (ws: Workspace, input: ScheduleInput, now = new Date()): Promise<PostSchedule> => {
  const current = await getOrCreateSchedule(ws);
  const { platform, ...fields } = input;
  const changedDays = current.weekdays.join() !== input.weekdays.join();
  const schedule = await prisma.postSchedule.update({
    where: { id: current.id },
    data: { ...fields, pausedAt: input.autopilot ? null : current.pausedAt },
  });
  // Her future posts should land on the days she just picked, so replan what hasn't gone out yet.
  if (changedDays) await replanUpcoming(ws, schedule, now);
  await prisma.postSlot.updateMany({ where: { workspaceId: ws.id, status: 'planned' }, data: { platform } });
  return schedule;
};

/** Dates in the future that already hold a slot — so we never double-book a day. */
const takenDates = async (workspaceId: string, from: Date): Promise<Set<string>> => {
  const slots = await prisma.postSlot.findMany({
    where: { workspaceId, scheduledFor: { gte: startOfDay(from) }, status: { notIn: OFF_CALENDAR } },
    select: { scheduledFor: true },
  });
  return new Set(slots.map((s) => isoDate(s.scheduledFor)));
};

const toPlaceable = (item: { id: string; score: number | null; scoreDetails: unknown; sceneId: string | null; createdAt: Date }): PlaceableItem => ({
  id: item.id,
  score: item.score,
  bestFor: (item.scoreDetails as ScoreDetails | null)?.bestFor ?? null,
  sceneId: item.sceneId,
  createdAt: item.createdAt,
});

/**
 * Puts every finished photo that isn't already booked onto the next open dates.
 * Safe to call repeatedly: a photo is scheduled once (unique workspace+item), and posted days are left alone.
 */
export const autoFill = async (ws: Workspace, now = new Date()): Promise<number> => {
  if (ws.product !== 'brand') return 0;
  const schedule = await getOrCreateSchedule(ws);
  if (!schedule.active || !schedule.autoFill) return 0;

  const unbooked = await prisma.batchItem.findMany({
    // Photos made from a property are hers to pick one by one ("Add to calendar"); archived ones never go on.
    where: { batch: { workspaceId: ws.id, listingId: null }, status: 'ready', r2Key: { not: null }, archivedAt: null, slots: { none: {} } },
    select: { id: true, score: true, scoreDetails: true, sceneId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: HORIZON_SLOTS,
  });
  if (unbooked.length === 0) return 0;

  const dates = nextSlotDates(now, schedule.weekdays, Math.min(unbooked.length, HORIZON_SLOTS), await takenDates(ws.id, now));
  const placements = placeItems(unbooked.map(toPlaceable), dates);
  if (placements.length === 0) return 0;

  const created = await prisma.postSlot.createMany({
    data: placements.map((p) => ({
      workspaceId: ws.id,
      scheduleId: schedule.id,
      scheduledFor: new Date(`${p.scheduledFor}T00:00:00.000Z`),
      slotOfDay: p.slotOfDay,
      itemId: p.itemId,
      source: 'auto',
    })),
    skipDuplicates: true,
  });
  await prisma.postSchedule.update({ where: { id: schedule.id }, data: { lastFilledAt: now } });
  return created.count;
};

/** "Add to calendar" on one photo: booked on her next open posting day. Returns the photo's slot (existing or new). */
export const addToCalendar = async (ws: Workspace, itemId: string, now = new Date()): Promise<PostSlot> => {
  const schedule = await getOrCreateSchedule(ws);
  const item = await prisma.batchItem.findFirst({ where: { id: itemId, batch: { workspaceId: ws.id }, status: 'ready', r2Key: { not: null }, archivedAt: null } });
  if (!item) throw new HttpError(404, 'item_not_found', 'That photo is not ready yet.');
  const existing = await prisma.postSlot.findFirst({ where: { workspaceId: ws.id, itemId } });
  if (existing && isOnCalendar(existing.status)) return existing;
  const [date] = nextSlotDates(now, schedule.weekdays, 1, await takenDates(ws.id, now));
  if (!date) throw new HttpError(409, 'calendar_full', 'Your calendar is full. Remove a post first.');
  const scheduledFor = new Date(`${date}T00:00:00.000Z`);
  // Back on after she took it off: a fresh day, not the old one that may have passed.
  if (existing) return prisma.postSlot.update({ where: { id: existing.id }, data: { status: 'planned', scheduledFor, source: 'manual' } });
  const [placement] = placeItems([toPlaceable(item)], [date]);
  try {
    return await prisma.postSlot.create({
      data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor, slotOfDay: placement?.slotOfDay ?? 'evening', itemId, source: 'manual' },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return prisma.postSlot.findFirstOrThrow({ where: { workspaceId: ws.id, itemId } });
    throw err;
  }
};

/** Takes a photo off the calendar, and keeps it off. A post she already marked done stays. */
export const removeFromCalendar = async (workspaceId: string, itemId: string): Promise<void> => {
  await prisma.postSlot.updateMany({ where: { workspaceId, itemId, status: { not: 'posted' } }, data: { status: 'removed' } });
};

/**
 * Puts the photos she picked on one day — several on a day is fine. A photo already planned elsewhere
 * moves to this day; one she already posted stays where it was.
 */
export const addPhotosToDay = async (ws: Workspace, date: string, itemIds: readonly string[], now = new Date()): Promise<number> => {
  const schedule = await getOrCreateSchedule(ws);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new HttpError(400, 'invalid_date', 'Pick a day.');
  if (date < isoDate(now)) throw new HttpError(400, 'past_date', 'Pick today or a day ahead.');
  const ids = [...new Set(itemIds)].slice(0, MAX_PHOTOS_PER_ADD);
  if (ids.length === 0) throw new HttpError(400, 'no_photos', 'Pick at least one photo.');

  const items = await prisma.batchItem.findMany({
    where: { id: { in: ids }, batch: { workspaceId: ws.id }, status: 'ready', r2Key: { not: null }, archivedAt: null },
    select: { id: true, slots: { select: { id: true, status: true } } },
  });
  const scheduledFor = new Date(`${date}T00:00:00.000Z`);
  let added = 0;
  for (const item of items) {
    const slot = item.slots[0];
    if (slot?.status === 'posted') continue;
    if (slot) {
      await prisma.postSlot.update({ where: { id: slot.id }, data: { scheduledFor, status: 'planned', source: 'manual' } });
    } else {
      await prisma.postSlot.create({ data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor, itemId: item.id, source: 'manual' } });
    }
    added += 1;
  }
  return added;
};

/** Takes one post off her calendar by its slot. */
export const removeSlot = async (workspaceId: string, slotId: string): Promise<PostSlot> => {
  const slot = await ownedSlot(workspaceId, slotId);
  if (slot.status === 'posted') throw new HttpError(409, 'already_posted', 'This one is already posted.');
  return prisma.postSlot.update({ where: { id: slot.id }, data: { status: 'removed' } });
};

/** Photos she can add to a day: ready, kept, and not already planned or posted. Newest first. */
export const listAddablePhotos = async (workspaceId: string, cursor: string | null, take = 30) => {
  const rows = await prisma.batchItem.findMany({
    where: { batch: { workspaceId }, status: 'ready', r2Key: { not: null }, archivedAt: null, slots: { none: { status: { notIn: OFF_CALENDAR } } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, r2Key: true, batch: { select: { name: true } } },
  });
  return { rows: rows.slice(0, take), nextCursor: rows.length > take ? rows[take - 1]!.id : null };
};

/** Called when a batch finishes; never throws into the generation pipeline. */
export const autoFillWorkspace = async (workspaceId: string, now = new Date()): Promise<void> => {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (ws) await autoFill(ws, now);
};

/** Moves everything still planned onto the current cadence, keeping the order she already has. */
export const replanUpcoming = async (ws: Workspace, schedule: PostSchedule, now = new Date()): Promise<void> => {
  const upcoming = await prisma.postSlot.findMany({
    where: { workspaceId: ws.id, status: 'planned', scheduledFor: { gte: startOfDay(now) } },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
  });
  if (upcoming.length === 0) return;
  const dates = nextSlotDates(now, schedule.weekdays, upcoming.length);
  await prisma.$transaction(
    upcoming.slice(0, dates.length).map((slot, i) =>
      prisma.postSlot.update({ where: { id: slot.id }, data: { scheduledFor: new Date(`${dates[i]!}T00:00:00.000Z`) } }),
    ),
  );
};

export type SlotWithItem = PostSlot & {
  item: ({ id: string; batchId: string; r2Key: string | null; postKit: unknown; score: number | null; scoreDetails: unknown; sceneId: string | null; batch: { name: string } }) | null;
  material: { id: string; label: string | null } | null;
};

export const listSlots = async (workspaceId: string, from: Date, to: Date): Promise<SlotWithItem[]> =>
  prisma.postSlot.findMany({
    where: { workspaceId, scheduledFor: { gte: startOfDay(from), lte: startOfDay(to) }, status: { not: 'removed' } },
    include: {
      item: { select: { id: true, batchId: true, r2Key: true, postKit: true, score: true, scoreDetails: true, sceneId: true, batch: { select: { name: true } } } },
      material: { select: { id: true, label: true } },
    },
    orderBy: [{ scheduledFor: 'asc' }, { slotOfDay: 'asc' }],
  });

/** Posts marked done inside the rolling promise window. */
export const postsInWindow = async (workspaceId: string, days = PROMISE.windowDays, now = new Date()): Promise<number> =>
  prisma.postSlot.count({ where: { workspaceId, status: 'posted', postedAt: { gte: windowStart(now, days) } } });

/** Every link she saved when marking a post done — prefills the promise claim. */
export const postedLinks = async (workspaceId: string, days = PROMISE.windowDays, now = new Date()): Promise<string[]> => {
  const rows = await prisma.postSlot.findMany({
    where: { workspaceId, status: 'posted', postedAt: { gte: windowStart(now, days) }, postUrl: { not: null } },
    orderBy: { postedAt: 'desc' },
    take: 12,
    select: { postUrl: true },
  });
  return rows.map((r) => r.postUrl).filter((u): u is string => Boolean(u));
};

const ownedSlot = async (workspaceId: string, slotId: string): Promise<PostSlot> => {
  const slot = await prisma.postSlot.findFirst({ where: { id: slotId, workspaceId } });
  if (!slot) throw new HttpError(404, 'slot_not_found', 'That post is no longer in your calendar.');
  return slot;
};

/**
 * Marks a post done. Called by the Post sheet as soon as she copies the caption or saves the photo —
 * she should never have to tick a box to keep her own guarantee alive (plan §2.2).
 */
export const markPosted = async (workspaceId: string, slotId: string, postUrl: string | null, now = new Date()): Promise<PostSlot> => {
  const slot = await ownedSlot(workspaceId, slotId);
  if (slot.status === 'posted') {
    return postUrl ? prisma.postSlot.update({ where: { id: slot.id }, data: { postUrl } }) : slot;
  }
  return prisma.postSlot.update({ where: { id: slot.id }, data: { status: 'posted', postedAt: now, postUrl } });
};

export const undoPosted = async (workspaceId: string, slotId: string): Promise<PostSlot> => {
  await ownedSlot(workspaceId, slotId);
  return prisma.postSlot.update({ where: { id: slotId }, data: { status: 'planned', postedAt: null, postUrl: null } });
};

export const skipSlot = async (workspaceId: string, slotId: string): Promise<PostSlot> => {
  await ownedSlot(workspaceId, slotId);
  return prisma.postSlot.update({ where: { id: slotId }, data: { status: 'skipped' } });
};

/** Moves a post to another day — by drag and drop, or the date field in the post sheet. */
export const moveSlot = async (workspaceId: string, slotId: string, date: string, now = new Date()): Promise<PostSlot> => {
  const slot = await ownedSlot(workspaceId, slotId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new HttpError(400, 'invalid_date', 'Pick a day.');
  if (date < isoDate(now)) throw new HttpError(400, 'past_date', 'Pick today or a day ahead.');
  // A post she already published happened on its day; moving it would rewrite what she did.
  if (slot.status === 'posted') throw new HttpError(409, 'already_posted', 'This one is already posted.');
  return prisma.postSlot.update({ where: { id: slot.id }, data: { scheduledFor: new Date(`${date}T00:00:00.000Z`), status: 'planned' } });
};

/** Swaps the photo in a slot for another of hers — the "not this one" escape hatch. */
export const swapPhoto = async (workspaceId: string, slotId: string, itemId: string): Promise<PostSlot> => {
  await ownedSlot(workspaceId, slotId);
  const item = await prisma.batchItem.findFirst({ where: { id: itemId, batch: { workspaceId }, status: 'ready' }, select: { id: true } });
  if (!item) throw new HttpError(404, 'item_not_found', 'That photo is not ready yet.');
  await prisma.postSlot.deleteMany({ where: { workspaceId, itemId, id: { not: slotId } } });
  return prisma.postSlot.update({ where: { id: slotId }, data: { itemId } });
};
