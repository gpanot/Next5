// server-only — never import from a 'use client' file.
// Slideshows she can put on a calendar day by hand: made by Autopilot, but not on the calendar right now.

import type { Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { getOrCreateSchedule } from './calendar';
import { isoDate } from './schedule';

const MAX_PER_ADD = 30;

/**
 * Every ready slideshow, same as the Library: off the calendar, posted (ready to repost), or planned
 * (picking it moves it to the new day). Newest first.
 */
export const listAddableSlideshows = async (workspaceId: string, take = 60) =>
  prisma.campaignPost.findMany({
    where: { campaign: { workspaceId }, format: 'slideshow', mediaStatus: 'ready', skipped: false },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    select: {
      id: true, idea: true, slides: true,
      slots: { where: { status: { in: ['planned', 'posted'] } }, select: { status: true, scheduledFor: true }, orderBy: { scheduledFor: 'asc' } },
    },
  });

/** Puts the picked slideshows on one day. Returns how many were added. */
export const addSlideshowsToDay = async (ws: Workspace, date: string, postIds: readonly string[], now = new Date()): Promise<number> => {
  const schedule = await getOrCreateSchedule(ws);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new HttpError(400, 'invalid_date', 'Pick a day.');
  if (date < isoDate(now)) throw new HttpError(400, 'past_date', 'Pick today or a day ahead.');
  const ids = [...new Set(postIds)].slice(0, MAX_PER_ADD);
  if (ids.length === 0) return 0;

  const posts = await prisma.campaignPost.findMany({
    where: { id: { in: ids }, format: 'slideshow', campaign: { workspaceId: ws.id } },
    select: { id: true, slots: { select: { id: true, status: true } } },
  });
  const scheduledFor = new Date(`${date}T00:00:00.000Z`);
  let added = 0;
  for (const post of posts) {
    if (post.slots.some((s) => s.status === 'planned')) {
      // Already on another day: move it here.
      await prisma.postSlot.updateMany({ where: { campaignPostId: post.id, workspaceId: ws.id, status: 'planned' }, data: { scheduledFor, source: 'manual' } });
      added += 1;
      continue;
    }
    // Otherwise a fresh slot: a posted slideshow keeps its history and goes out again.
    await prisma.postSlot.create({ data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor, campaignPostId: post.id, source: 'manual' } });
    added += 1;
  }
  return added;
};
