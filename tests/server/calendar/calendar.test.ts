import type { Workspace } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import {
  autoFill,
  getOrCreateSchedule,
  listSlots,
  markPosted,
  moveSlot,
  parseScheduleInput,
  postedLinks,
  postsInWindow,
  saveSchedule,
  skipSlot,
  swapPhoto,
  undoPosted,
} from '../../../src/server/calendar/calendar';
import { isoDate } from '../../../src/server/calendar/schedule';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const NOW = at('2026-09-15T09:00:00Z'); // a Tuesday
const input = (over: Record<string, unknown> = {}) =>
  parseScheduleInput({ active: true, weekdays: [2, 4, 6], timezone: 'America/New_York', platform: 'instagram', ...over });

/** A finished batch of `count` photos, newest scored highest. */
const readyBatch = async (ws: Workspace, count: number, over: { sceneId?: (i: number) => string; bestFor?: string } = {}) => {
  const batch = await prisma.batch.create({
    data: { workspaceId: ws.id, kind: 'brand_theme', status: 'ready', name: 'September', formats: ['portrait_4_5'] },
  });
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(
      await prisma.batchItem.create({
        data: {
          batchId: batch.id,
          format: 'portrait_4_5',
          prompt: 'p',
          status: 'ready',
          r2Key: `key-${i}`,
          score: 90 - i,
          scoreDetails: { version: 1, criteria: {}, tip: 't', bestFor: over.bestFor ?? 'feed' },
          sceneId: over.sceneId?.(i) ?? `scene-${i}`,
        },
      }),
    );
  }
  return { batch, items };
};

describe('schedule', () => {
  it('creates a Tue/Thu/Sat default with an ics token the first time she opens it', async () => {
    const ws = await createTestWorkspace('brand');
    const schedule = await getOrCreateSchedule(ws);
    expect(schedule.weekdays).toEqual([2, 4, 6]);
    expect(schedule.autoFill).toBe(true);
    expect(schedule.autopilot).toBe(false); // off until her first manual batch
    expect(schedule.icsToken).toHaveLength(32);
    // Asking twice gives the same schedule, not a second one.
    expect((await getOrCreateSchedule(ws)).id).toBe(schedule.id);
  });

  it('survives many photos asking for the schedule at the same moment', async () => {
    const ws = await createTestWorkspace('brand');
    const schedules = await Promise.all(Array.from({ length: 8 }, () => getOrCreateSchedule(ws)));
    expect(new Set(schedules.map((s) => s.id)).size).toBe(1);
    // Still reads as untouched, so autopilot can switch itself on later.
    const [first] = schedules;
    expect(first!.updatedAt.getTime()).toBe(first!.createdAt.getTime());
  });

  it('is Brand only', async () => {
    const shop = await createTestWorkspace('shop');
    await expect(getOrCreateSchedule(shop)).rejects.toMatchObject({ status: 400 });
  });

  it('rejects an empty or out-of-range cadence', () => {
    expect(() => parseScheduleInput({ weekdays: [] })).toThrow(/at least one day/);
    expect(() => parseScheduleInput({ weekdays: [9] })).toThrow(/at least one day/);
    expect(() => parseScheduleInput({ weekdays: [1], platform: 'myspace' })).toThrow(/where you post/);
    expect(parseScheduleInput({ weekdays: [4, 2, 2] }).weekdays).toEqual([2, 4]);
  });

  it('moves her upcoming posts when she changes the days', async () => {
    const ws = await createTestWorkspace('brand');
    await getOrCreateSchedule(ws);
    await readyBatch(ws, 3);
    await autoFill(ws, NOW);
    await saveSchedule(ws, input({ weekdays: [1] }), NOW); // Mondays only
    const slots = await listSlots(ws.id, NOW, at('2026-10-30T00:00:00Z'));
    for (const slot of slots) expect(slot.scheduledFor.getUTCDay()).toBe(1);
  });
});

describe('autoFill', () => {
  it('puts her best photo on the next posting day and never repeats a scene back to back', async () => {
    const ws = await createTestWorkspace('brand');
    await readyBatch(ws, 4, { sceneId: (i) => (i < 2 ? 'desk' : 'door') });
    expect(await autoFill(ws, NOW)).toBe(4);

    const slots = await listSlots(ws.id, NOW, at('2026-10-30T00:00:00Z'));
    expect(slots.map((s) => isoDate(s.scheduledFor))).toEqual(['2026-09-15', '2026-09-17', '2026-09-19', '2026-09-22']);
    expect(slots[0]?.item?.score).toBe(90); // the best one goes first
    const scenes = slots.map((s) => s.item?.sceneId);
    expect(scenes[0]).not.toBe(scenes[1]);
  });

  it('never books the same photo twice, however often it runs', async () => {
    const ws = await createTestWorkspace('brand');
    await readyBatch(ws, 3);
    expect(await autoFill(ws, NOW)).toBe(3);
    expect(await autoFill(ws, NOW)).toBe(0);
    expect(await prisma.postSlot.count({ where: { workspaceId: ws.id } })).toBe(3);
  });

  it('skips days that already hold a post', async () => {
    const ws = await createTestWorkspace('brand');
    const schedule = await getOrCreateSchedule(ws);
    await prisma.postSlot.create({
      data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor: new Date('2026-09-17T00:00:00Z'), source: 'manual' },
    });
    await readyBatch(ws, 2);
    await autoFill(ws, NOW);
    const dates = (await listSlots(ws.id, NOW, at('2026-10-30T00:00:00Z'))).map((s) => isoDate(s.scheduledFor));
    expect(dates).toEqual(['2026-09-15', '2026-09-17', '2026-09-19']);
  });

  it('leaves profile photos out of the feed', async () => {
    const ws = await createTestWorkspace('brand');
    await readyBatch(ws, 2, { bestFor: 'profile' });
    expect(await autoFill(ws, NOW)).toBe(0);
  });

  it('does nothing when she has turned it off, and nothing for a shop', async () => {
    const ws = await createTestWorkspace('brand');
    await readyBatch(ws, 2);
    await saveSchedule(ws, input({ autoFill: false }), NOW);
    expect(await autoFill(ws, NOW)).toBe(0);
    expect(await autoFill(await createTestWorkspace('shop'), NOW)).toBe(0);
  });

  it('ignores photos that are still generating', async () => {
    const ws = await createTestWorkspace('brand');
    const batch = await prisma.batch.create({
      data: { workspaceId: ws.id, kind: 'brand_theme', status: 'generating', name: 'x', formats: ['portrait_4_5'] },
    });
    await prisma.batchItem.create({ data: { batchId: batch.id, format: 'portrait_4_5', prompt: 'p', status: 'generating' } });
    expect(await autoFill(ws, NOW)).toBe(0);
  });
});

describe('posting', () => {
  it('counts posts in the promise window and keeps her links for the claim', async () => {
    const ws = await createTestWorkspace('brand');
    const { items } = await readyBatch(ws, 3);
    await autoFill(ws, NOW);
    const slots = await listSlots(ws.id, NOW, at('2026-10-30T00:00:00Z'));

    await markPosted(ws.id, slots[0]!.id, 'https://instagram.com/p/abc', NOW);
    await markPosted(ws.id, slots[1]!.id, null, NOW);
    expect(await postsInWindow(ws.id, 30, NOW)).toBe(2);
    expect(await postedLinks(ws.id, 30, NOW)).toEqual(['https://instagram.com/p/abc']);

    // Marking twice is harmless — the sheet fires it on copy and on save.
    await markPosted(ws.id, slots[0]!.id, null, NOW);
    expect(await postsInWindow(ws.id, 30, NOW)).toBe(2);

    await undoPosted(ws.id, slots[0]!.id);
    expect(await postsInWindow(ws.id, 30, NOW)).toBe(1);
    expect(items).toHaveLength(3);
  });

  it('leaves posts outside the 30-day window out of the count', async () => {
    const ws = await createTestWorkspace('brand');
    await readyBatch(ws, 1);
    await autoFill(ws, NOW);
    const [slot] = await listSlots(ws.id, NOW, at('2026-10-30T00:00:00Z'));
    await markPosted(ws.id, slot!.id, null, at('2026-08-01T00:00:00Z'));
    expect(await postsInWindow(ws.id, 30, NOW)).toBe(0);
  });

  it('skips and moves a post, and swaps the photo for another of hers', async () => {
    const ws = await createTestWorkspace('brand');
    const { items } = await readyBatch(ws, 3);
    await autoFill(ws, NOW);
    const slots = await listSlots(ws.id, NOW, at('2026-10-30T00:00:00Z'));

    expect((await skipSlot(ws.id, slots[0]!.id)).status).toBe('skipped');
    expect(isoDate((await moveSlot(ws.id, slots[1]!.id, '2026-09-30')).scheduledFor)).toBe('2026-09-30');
    await expect(moveSlot(ws.id, slots[1]!.id, 'soon')).rejects.toMatchObject({ status: 400 });

    // Swapping in a photo that is booked elsewhere frees the other slot rather than failing.
    const swapped = await swapPhoto(ws.id, slots[1]!.id, items[2]!.id);
    expect(swapped.itemId).toBe(items[2]!.id);
    expect(await prisma.postSlot.count({ where: { workspaceId: ws.id } })).toBe(2);
  });

  it('refuses to touch another workspace', async () => {
    const mine = await createTestWorkspace('brand');
    const theirs = await createTestWorkspace('brand');
    await readyBatch(theirs, 1);
    await autoFill(theirs, NOW);
    const [slot] = await listSlots(theirs.id, NOW, at('2026-10-30T00:00:00Z'));
    await expect(markPosted(mine.id, slot!.id, null, NOW)).rejects.toMatchObject({ status: 404 });
  });
});
