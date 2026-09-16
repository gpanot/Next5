import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { autoFill, getOrCreateSchedule, markPosted } from '../../../src/server/calendar/calendar';
import { buildIcs, isDigestDay, sendWeeklyDigests } from '../../../src/server/calendar/digest';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const NOW = at('2026-09-15T09:00:00Z'); // Tuesday morning
const TTS = [2, 4, 6];

const withPhotos = async (count: number) => {
  const ws = await createTestWorkspace('brand');
  const batch = await prisma.batch.create({
    data: { workspaceId: ws.id, kind: 'brand_theme', status: 'ready', name: 'September', formats: ['portrait_4_5'] },
  });
  for (let i = 0; i < count; i += 1) {
    await prisma.batchItem.create({
      data: {
        batchId: batch.id, format: 'portrait_4_5', prompt: 'p', status: 'ready', r2Key: `key-${i}`, score: 90 - i,
        postKit: { hook: `Hook ${i}`, caption: 'c', hashtags: ['#a'], description: null },
      },
    });
  }
  await autoFill(ws, NOW);
  return ws;
};

describe('isDigestDay', () => {
  it('writes on the morning of her first posting day, once a week', () => {
    expect(isDigestDay(TTS, NOW)).toBe(true); // Tuesday 09:00
    expect(isDigestDay(TTS, at('2026-09-15T05:00:00Z'))).toBe(false); // too early
    expect(isDigestDay(TTS, at('2026-09-17T09:00:00Z'))).toBe(false); // Thursday
    expect(isDigestDay([1], NOW)).toBe(false); // she posts Mondays
    expect(isDigestDay([], NOW)).toBe(false);
  });
});

describe('the weekly delivery', () => {
  it('sends her week once, and not twice on the same day', async () => {
    await withPhotos(3);
    expect(await sendWeeklyDigests(NOW)).toBe(1);
    expect(await sendWeeklyDigests(NOW)).toBe(0);

    const log = await prisma.emailLog.findFirstOrThrow({ where: { template: 'posts_ready' } });
    expect(log.dedupeKey).toContain('2026-09-15');
  });

  it('stays quiet when she has nothing ready, or has turned it off', async () => {
    await createTestWorkspace('brand');
    expect(await sendWeeklyDigests(NOW)).toBe(0);

    const ws = await withPhotos(2);
    await prisma.postSchedule.update({ where: { workspaceId: ws.id }, data: { weeklyDigest: false } });
    expect(await sendWeeklyDigests(NOW)).toBe(0);
  });

  it('counts what she posted last week rather than what she missed', async () => {
    const ws = await withPhotos(3);
    const [slot] = await prisma.postSlot.findMany({ where: { workspaceId: ws.id }, orderBy: { scheduledFor: 'asc' } });
    await markPosted(ws.id, slot!.id, null, at('2026-09-14T10:00:00Z'));

    expect(await sendWeeklyDigests(NOW)).toBe(1);
    const log = await prisma.emailLog.findFirstOrThrow({ where: { template: 'posts_ready' } });
    expect(log.template).toBe('posts_ready');
  });
});

describe('the calendar feed', () => {
  it('builds a subscribable feed of her posts', async () => {
    const ws = await withPhotos(2);
    const schedule = await getOrCreateSchedule(ws);
    const ics = await buildIcs(schedule.icsToken, NOW);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('X-WR-CALNAME:Next5 posts');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260915');
    expect(ics).toContain('SUMMARY:Post: Hook 0');
    expect(ics?.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics?.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('marks what she has already posted', async () => {
    const ws = await withPhotos(1);
    const schedule = await getOrCreateSchedule(ws);
    const [slot] = await prisma.postSlot.findMany({ where: { workspaceId: ws.id } });
    await markPosted(ws.id, slot!.id, null, NOW);
    expect(await buildIcs(schedule.icsToken, NOW)).toContain('SUMMARY:Posted: Hook 0');
  });

  it('gives nothing for an unknown token', async () => {
    expect(await buildIcs('not-a-real-token', NOW)).toBeNull();
  });
});
