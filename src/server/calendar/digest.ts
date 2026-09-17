// server-only — never import from a 'use client' file.
// The weekly delivery and the calendar feed. Four touches a month, each carrying finished work —
// not twelve nags (docs/business-studios/11-calendar-plan.md §2.2).

import type { PostKitDto } from '../../types/business/batches';
import { prisma } from '../../lib/db';
import { sendOnce } from '../email/send';
import { postsReadyEmail } from '../email/templates';
import { OFF_CALENDAR } from './calendar';
import { isoDate, startOfDay } from './schedule';

const DAY = 86_400_000;
/** Sent on the morning of her first posting day of the week. */
const DIGEST_HOUR_UTC = 7;

/**
 * Is this the right morning to write to her? The day before her next post, once a week at most.
 * Sending on the day itself would read as a reminder about work already due.
 */
export const isDigestDay = (weekdays: readonly number[], now: Date): boolean => {
  if (now.getUTCHours() < DIGEST_HOUR_UTC) return false;
  const sorted = [...weekdays].sort((a, b) => a - b);
  const first = sorted[0];
  return first !== undefined && now.getUTCDay() === first;
};

/** Sends each member her week: what is ready, and what she did last week. Idempotent per week. */
export const sendWeeklyDigests = async (now = new Date(), limit = 200): Promise<number> => {
  const schedules = await prisma.postSchedule.findMany({
    where: { active: true, weeklyDigest: true },
    include: { workspace: { select: { id: true, ownerUserId: true } } },
    take: limit,
  });

  let sent = 0;
  for (const schedule of schedules) {
    if (!isDigestDay(schedule.weekdays, now)) continue;

    const weekEnd = new Date(now.getTime() + 7 * DAY);
    const [ready, postedLastWeek] = await Promise.all([
      prisma.postSlot.findMany({
        where: { workspaceId: schedule.workspaceId, status: 'planned', itemId: { not: null }, scheduledFor: { gte: startOfDay(now), lte: startOfDay(weekEnd) } },
        include: { item: { select: { postKit: true } } },
        orderBy: { scheduledFor: 'asc' },
      }),
      prisma.postSlot.count({ where: { workspaceId: schedule.workspaceId, status: 'posted', postedAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    ]);
    if (ready.length === 0) continue;

    const hook = (ready[0]?.item?.postKit as PostKitDto | null)?.hook ?? null;
    const ok = await sendOnce({
      userId: schedule.workspace.ownerUserId,
      workspaceId: schedule.workspaceId,
      template: 'posts_ready',
      dedupeKey: `posts-ready:${schedule.workspaceId}:${isoDate(now)}`,
      content: postsReadyEmail(ready.length, hook, postedLastWeek),
    });
    if (ok) sent += 1;
  }
  return sent;
};

const escapeIcs = (text: string): string => text.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
const stamp = (iso: string): string => iso.replace(/-/g, '');

/**
 * A subscribable calendar feed. Her posts simply appear in the calendar she already uses —
 * present without nagging, and no OAuth anywhere.
 */
export const buildIcs = async (icsToken: string, now = new Date()): Promise<string | null> => {
  const schedule = await prisma.postSchedule.findUnique({ where: { icsToken } });
  if (!schedule) return null;

  const slots = await prisma.postSlot.findMany({
    where: { workspaceId: schedule.workspaceId, status: { notIn: OFF_CALENDAR }, scheduledFor: { gte: startOfDay(new Date(now.getTime() - 30 * DAY)) } },
    include: { item: { select: { postKit: true } }, material: { select: { label: true } } },
    orderBy: { scheduledFor: 'asc' },
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Next5//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Next5 posts',
  ];
  for (const slot of slots) {
    const hook = (slot.item?.postKit as PostKitDto | null)?.hook ?? slot.material?.label ?? 'Your Next5 post';
    const day = isoDate(slot.scheduledFor);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${slot.id}@next5.studio`,
      `DTSTAMP:${stamp(isoDate(now))}T000000Z`,
      `DTSTART;VALUE=DATE:${stamp(day)}`,
      `DTEND;VALUE=DATE:${stamp(isoDate(new Date(slot.scheduledFor.getTime() + DAY)))}`,
      `SUMMARY:${escapeIcs(slot.status === 'posted' ? `Posted: ${hook}` : `Post: ${hook}`)}`,
      `DESCRIPTION:${escapeIcs('Open Next5 to save the photo and copy the caption.')}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
};
