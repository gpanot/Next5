// server-only — never import from a 'use client' file.
// Where each beat of a playbook lands: after a start date (Just listed, Price drop, Just sold, Market update), ending
// on the open house day (Open house), or one pool beat per free day (Evergreen). Never on top of a filled day, except
// the open house days, which are fixed. Plan: docs/business-studios/15-realtor-autopilot-plan.md §3–4.

import { prisma } from '../../lib/db';
import { fillBeats, placeBeats, placeEventBeats, type Beat, type Playbook } from '../../lib/realtorPlaybooks';
import { OFF_CALENDAR } from '../calendar/calendar';
import { HttpError } from '../http';

const DAY = 86_400_000;
const RECENT_DAYS = 30;

export type Placed = { beat: Beat; date: string };

/** Dates in the window that already hold a post (any source), so a playbook never lands on top of them. */
export const busyDates = async (workspaceId: string, startDate: string, windowDays: number): Promise<Set<string>> => {
  const from = new Date(`${startDate}T00:00:00.000Z`);
  const to = new Date(from.getTime() + windowDays * DAY);
  const rows = await prisma.postSlot.findMany({
    where: { workspaceId, scheduledFor: { gte: from, lt: to }, status: { notIn: OFF_CALENDAR } },
    select: { scheduledFor: true },
  });
  return new Set(rows.map((r) => r.scheduledFor.toISOString().slice(0, 10)));
};

/** Evergreen beats used in the last 30 days (or planned ahead): beatKey → latest date, so the pool rotates. */
const recentEvergreen = async (workspaceId: string, today: string): Promise<Map<string, string>> => {
  const since = new Date(Date.parse(`${today}T00:00:00.000Z`) - RECENT_DAYS * DAY);
  const rows = await prisma.campaignPost.findMany({
    where: { campaign: { workspaceId, playbook: 'evergreen' }, skipped: false, scheduledFor: { gte: since } },
    select: { beatKey: true, scheduledFor: true },
  });
  const out = new Map<string, string>();
  for (const r of rows) {
    const date = r.scheduledFor?.toISOString().slice(0, 10) ?? '';
    if (r.beatKey && date > (out.get(r.beatKey) ?? '')) out.set(r.beatKey, date);
  }
  return out;
};

export type PlanContext = {
  workspaceId: string;
  startDate: string;
  today: string;
  /** Open house day, YYYY-MM-DD. */
  eventDate: string | null;
  hasFace: boolean;
  hasArea: boolean;
};

export const placePlaybook = async (playbook: Playbook, ctx: PlanContext): Promise<Placed[]> => {
  if (playbook.placement === 'event') {
    if (!ctx.eventDate) throw new HttpError(400, 'no_event', 'Pick the open house day.');
    if (ctx.eventDate < ctx.today) throw new HttpError(400, 'event_past', 'That open house day is past.');
    return placeEventBeats(playbook.beats, ctx.eventDate, ctx.today);
  }
  const busy = await busyDates(ctx.workspaceId, ctx.startDate, playbook.windowDays);
  if (playbook.placement === 'fill') {
    const recent = await recentEvergreen(ctx.workspaceId, ctx.today);
    return fillBeats(playbook.beats, ctx.startDate, busy, playbook.windowDays, { hasFace: ctx.hasFace, hasArea: ctx.hasArea, recent });
  }
  return placeBeats(playbook.beats, ctx.startDate, busy, playbook.windowDays);
};

export const dayIndexOf = (date: string, startDate: string) => Math.round((Date.parse(`${date}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) / DAY);
