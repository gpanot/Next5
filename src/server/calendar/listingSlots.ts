// server-only — never import from a 'use client' file.
// "Add to calendar" on the listing page: puts one of the home's slideshows on a day, and reads where the
// home's videos and slideshows sit on the calendar.

import type { Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { ItemCalendarDto } from '../../types/business/calendar';
import { HttpError } from '../http';
import { getOrCreateSchedule } from './calendar';
import { isoDate } from './schedule';

const MAX_PER_ADD = 30;

/** Puts the picked listing slideshows on one day; one already planned moves there. Returns how many were added. */
export const addListingSlideshowsToDay = async (ws: Workspace, date: string, showIds: readonly string[], now = new Date()): Promise<number> => {
  const schedule = await getOrCreateSchedule(ws);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new HttpError(400, 'invalid_date', 'Pick a day.');
  if (date < isoDate(now)) throw new HttpError(400, 'past_date', 'Pick today or a day ahead.');
  const ids = [...new Set(showIds)].slice(0, MAX_PER_ADD);
  if (ids.length === 0) return 0;

  const shows = await prisma.listingSlideshow.findMany({
    where: { id: { in: ids }, workspaceId: ws.id, status: 'ready' },
    select: { id: true, slots: { select: { id: true } } },
  });
  const scheduledFor = new Date(`${date}T00:00:00.000Z`);
  for (const show of shows) {
    const slot = show.slots[0];
    if (slot) {
      // Planned, removed or posted: the same slot goes to the new day (a posted one comes back as a repost).
      await prisma.postSlot.update({ where: { id: slot.id }, data: { scheduledFor, status: 'planned', source: 'manual', postUrl: null, postedAt: null } });
    } else {
      await prisma.postSlot.create({ data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor, listingSlideshowId: show.id, source: 'manual' } });
    }
  }
  return shows.length;
};

type SlotRow = { id: string; status: string; scheduledFor: Date };

/** The slot she sees: planned first, else the last posted one. Removed and skipped slots count as off the calendar. */
export const calendarOfSlots = (slots: readonly SlotRow[]): ItemCalendarDto | null => {
  const planned = slots.find((s) => s.status === 'planned');
  const posted = slots.filter((s) => s.status === 'posted').sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime())[0];
  const slot = planned ?? posted;
  return slot ? { slotId: slot.id, date: isoDate(slot.scheduledFor), status: slot.status === 'posted' ? 'posted' : 'planned' } : null;
};

const SLOT_SELECT = { select: { id: true, status: true, scheduledFor: true } } as const;

/** Calendar place of each listing video, by video id. */
export const videoCalendars = async (workspaceId: string, ids: readonly string[]): Promise<Map<string, ItemCalendarDto | null>> => {
  const rows = await prisma.listingVideo.findMany({ where: { workspaceId, id: { in: [...ids] } }, select: { id: true, slots: SLOT_SELECT } });
  return new Map(rows.map((r) => [r.id, calendarOfSlots(r.slots)]));
};

/** Calendar place of each listing slideshow, by slideshow id. */
export const slideshowCalendars = async (workspaceId: string, ids: readonly string[]): Promise<Map<string, ItemCalendarDto | null>> => {
  const rows = await prisma.listingSlideshow.findMany({ where: { workspaceId, id: { in: [...ids] } }, select: { id: true, slots: SLOT_SELECT } });
  return new Map(rows.map((r) => [r.id, calendarOfSlots(r.slots)]));
};
