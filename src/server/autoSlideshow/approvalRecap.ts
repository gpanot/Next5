// server-only — never import from a 'use client' file.
// The morning recap: at 8 am the user's time, one email when today still has posts waiting for approval on the
// Calendar. Planned ones never post on their own, so this is the nudge that keeps them from being missed.

import { prisma } from '../../lib/db';
import { sendOnce } from '../email/send';
import { approveTodayEmail, type PostToApprove } from '../email/templates';
import { CAMPAIGN_KIND, planOf } from './campaign/store';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Sent from 8 am; later hours only catch a run that was late or missed (the trigger is hourly). */
const RECAP_FROM_HOUR = 8;
const RECAP_UNTIL_HOUR = 11;
const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

/** Minutes behind UTC (as Date.getTimezoneOffset) in New York right now: the fallback for a workspace that never sent one. */
const newYorkOffset = (now: Date): number => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(now);
  const match = /GMT([+-]\d+)/.exec(parts.find((p) => p.type === 'timeZoneName')?.value ?? '');
  return match ? -Number(match[1]) * 60 : 300;
};

export type LocalDay = { hour: number; date: string; end: Date };

/** The user's local hour and date, and when their day ends (as a UTC instant), from a getTimezoneOffset value. */
export const localDay = (now: Date, offsetMin: number): LocalDay => {
  const local = new Date(now.getTime() - offsetMin * 60_000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return { hour: local.getUTCHours(), date: local.toISOString().slice(0, 10), end: new Date(midnight + DAY + offsetMin * 60_000) };
};

/** Planned Blitz videos and planned campaign slideshows in the next 24 h, by workspace. */
const plannedSoon = async (now: Date): Promise<Map<string, PostToApprove[]>> => {
  const until = new Date(now.getTime() + DAY);
  const byWorkspace = new Map<string, PostToApprove[]>();
  const add = (workspaceId: string, post: PostToApprove) => byWorkspace.set(workspaceId, [...(byWorkspace.get(workspaceId) ?? []), post]);

  const videos = await prisma.blitzScheduledPost.findMany({
    where: { status: 'planned', scheduledAt: { gt: now, lt: until } },
    select: { workspaceId: true, title: true, scheduledAt: true },
  });
  videos.forEach((v) => add(v.workspaceId, { title: v.title, at: v.scheduledAt }));

  const runs = await prisma.autoSlideshowRun.findMany({
    where: { kind: CAMPAIGN_KIND, workspaceId: { not: null } },
    select: { workspaceId: true, campaign: true, slideshows: { select: { position: true, status: true, topic: true, posts: { select: { status: true } } } } },
  });
  for (const run of runs) {
    // Same rule as the Calendar (campaignCalendar): a ready slideshow with a planned time and no live post waits there.
    const shows = new Map(run.slideshows.map((s) => [s.position, s]));
    for (const item of planOf(run, now)) {
      const show = shows.get(item.position);
      const at = new Date(item.at);
      if (!show || show.status !== 'ready' || show.posts.some((p) => LIVE.includes(p.status)) || at >= until) continue;
      add(run.workspaceId!, { title: show.topic, at });
    }
  }
  return byWorkspace;
};

/**
 * Emails each workspace owner whose morning it is about today's posts still to approve. Safe to run every hour (or
 * more): one email per workspace per local day, and none on a day with nothing to approve.
 */
export const sendApprovalRecaps = async (now = new Date()): Promise<number> => {
  const planned = await plannedSoon(now);
  if (planned.size === 0) return 0;
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: [...planned.keys()] }, product: 'slideshow', deletedAt: null },
    select: { id: true, ownerUserId: true, ideaTzOffsetMin: true },
  });
  const fallback = newYorkOffset(now);
  let sent = 0;
  for (const ws of workspaces) {
    const day = localDay(now, ws.ideaTzOffsetMin ?? fallback);
    if (day.hour < RECAP_FROM_HOUR || day.hour >= RECAP_UNTIL_HOUR) continue;
    const today = (planned.get(ws.id) ?? []).filter((p) => p.at < day.end).sort((a, b) => a.at.getTime() - b.at.getTime());
    if (today.length === 0) continue;
    const ok = await sendOnce({
      userId: ws.ownerUserId,
      workspaceId: ws.id,
      template: 'approve_today',
      dedupeKey: `approve-today:${ws.id}:${day.date}`,
      content: approveTodayEmail(ws.id, day.date, today, ws.ideaTzOffsetMin ?? fallback),
    });
    if (ok) sent += 1;
  }
  return sent;
};
