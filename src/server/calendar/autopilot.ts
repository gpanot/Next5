// server-only — never import from a 'use client' file.
// Autopilot: keeps two weeks of posts stocked without being asked.
// Plan: docs/business-studios/11-calendar-plan.md §2.2.

import type { PostSchedule, Workspace } from '@prisma/client';
import { isFormatId } from '../../config/formats';
import { prisma } from '../../lib/db';
import { getBalance } from '../credits/ledger';
import { createBatch, getActivePlan } from '../generation/createBatch';
import { OFF_CALENDAR } from './calendar';
import { isoDate, slotDatesUntil, startOfDay } from './schedule';

const DAY = 86_400_000;
/** One run never makes more than a fortnight of posts. */
const MAX_PER_RUN = 20;
/** Nothing posted in this long, with posts going stale, means she has stopped. */
const QUIET_DAYS = 14;
const QUIET_MISSED = 4;

/** Posting days inside the buffer window that hold no photo yet. */
export const missingSlots = async (schedule: PostSchedule, now: Date): Promise<number> => {
  const until = new Date(now.getTime() + schedule.bufferDays * DAY);
  const booked = await prisma.postSlot.findMany({
    where: { workspaceId: schedule.workspaceId, scheduledFor: { gte: startOfDay(now), lte: startOfDay(until) }, status: { notIn: OFF_CALENDAR } },
    select: { scheduledFor: true },
  });
  return slotDatesUntil(now, until, schedule.weekdays, new Set(booked.map((b) => isoDate(b.scheduledFor)))).length;
};

/**
 * Has she gone quiet? Planned posts whose day has passed, with nothing posted in a fortnight.
 * This both stops us spending on a member who has stopped, and raises the churn alarm early.
 */
export const hasGoneQuiet = async (workspaceId: string, now: Date): Promise<boolean> => {
  const since = new Date(now.getTime() - QUIET_DAYS * DAY);
  const [posted, missed] = await Promise.all([
    prisma.postSlot.count({ where: { workspaceId, status: 'posted', postedAt: { gte: since } } }),
    prisma.postSlot.count({ where: { workspaceId, status: 'planned', scheduledFor: { lt: startOfDay(since) } } }),
  ]);
  return posted === 0 && missed >= QUIET_MISSED;
};

const pickTheme = async (now: Date): Promise<string | null> => {
  const month = now.toISOString().slice(0, 7);
  const featured = await prisma.theme.findFirst({ where: { isActive: true, featuredMonth: month }, select: { id: true } });
  if (featured) return featured.id;
  const any = await prisma.theme.findFirst({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true } });
  return any?.id ?? null;
};

/** Creates one batch to refill her buffer. Returns how many photos were started. */
export const runAutopilotFor = async (ws: Workspace, schedule: PostSchedule, now = new Date()): Promise<number> => {
  const plan = await getActivePlan(ws.id, now);
  if (!plan) return 0;

  const needed = await missingSlots(schedule, now);
  if (needed <= 0) return 0;

  // Only her monthly allowance — never a top-up she bought for something specific, never an overdraft.
  const balance = await getBalance(ws.id, now);
  const count = Math.min(needed, balance.byBucket.plan, MAX_PER_RUN);
  if (count <= 0) return 0;

  const [set, themeId] = await Promise.all([
    prisma.studioSet.findFirst({ where: { workspaceId: ws.id, status: 'active' }, orderBy: { createdAt: 'desc' } }),
    pickTheme(now),
  ]);
  if (!set || !themeId) return 0;

  const formats = ws.defaultFormats.filter(isFormatId);
  await createBatch(
    ws,
    { kind: 'brand_theme', setId: set.id, themeId, count, formats: formats.length > 0 ? formats : ['portrait_4_5'], highRes: plan.highRes },
    now,
  );
  await prisma.postSchedule.update({ where: { id: schedule.id }, data: { lastGeneratedAt: now } });
  return count;
};

/** Daily cron: refill every member whose buffer has run down. Never throws for one bad workspace. */
export const runDueAutopilot = async (now = new Date(), limit = 50): Promise<number> => {
  const schedules = await prisma.postSchedule.findMany({
    where: { active: true, autopilot: true, pausedAt: null },
    include: { workspace: true },
    take: limit,
  });

  let started = 0;
  for (const schedule of schedules) {
    try {
      if (await hasGoneQuiet(schedule.workspaceId, now)) {
        await prisma.postSchedule.update({ where: { id: schedule.id }, data: { pausedAt: now } });
        continue;
      }
      started += await runAutopilotFor(schedule.workspace, schedule, now);
    } catch (err) {
      console.error('[autopilot] failed for workspace', schedule.workspaceId, err);
    }
  }
  return started;
};

/**
 * Autopilot switches itself on once she has made a batch by hand and seen the photos (plan §5.8).
 * Only for a schedule she has never touched — her own choice always wins.
 */
export const enableAfterFirstBatch = async (workspaceId: string, now = new Date()): Promise<void> => {
  const schedule = await prisma.postSchedule.findUnique({ where: { workspaceId } });
  const untouched = schedule && schedule.updatedAt.getTime() === schedule.createdAt.getTime();
  if (!schedule || !untouched || schedule.autopilot) return;
  await prisma.postSchedule.update({ where: { id: schedule.id }, data: { autopilot: true, lastGeneratedAt: now } });
};
