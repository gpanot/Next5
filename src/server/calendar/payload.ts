// server-only — never import from a 'use client' file.

import type { Workspace } from '@prisma/client';
import type { CalendarDto } from '../../types/business/calendar';
import { getActivePlan } from '../generation/createBatch';
import { getOrCreateSchedule, listSlots, postsInWindow } from './calendar';
import { toCalendarDto } from './dto';

const DAY = 86_400_000;
const FUTURE_DAYS = 70;

/** From a week before the 1st of this month, so the month grid is never missing its own first week. */
const windowStartDate = (now: Date): Date => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 7 * DAY);

/** Everything the calendar page shows, in one payload — returned after every change so the page never refetches. */
export const calendarPayload = async (ws: Workspace, origin: string, now = new Date()): Promise<CalendarDto> => {
  const [schedule, slots, posted, plan] = await Promise.all([
    getOrCreateSchedule(ws),
    listSlots(ws.id, windowStartDate(now), new Date(now.getTime() + FUTURE_DAYS * DAY)),
    postsInWindow(ws.id, undefined, now),
    getActivePlan(ws.id),
  ]);
  return toCalendarDto(schedule, slots, posted, Boolean(plan?.postKit), origin);
};
