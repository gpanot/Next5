import type { Workspace } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import {
  addPhotosToDay,
  addToCalendar,
  autoFill,
  listAddablePhotos,
  listSlots,
  markPosted,
  removeFromCalendar,
  removeSlot,
} from '../../../src/server/calendar/calendar';
import { isoDate } from '../../../src/server/calendar/schedule';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const NOW = at('2026-09-15T09:00:00Z'); // a Tuesday; default days Tue, Thu, Sat
const FAR = at('2026-12-31T00:00:00Z');

const photos = async (ws: Workspace, count: number) => {
  const batch = await prisma.batch.create({ data: { workspaceId: ws.id, kind: 'brand_theme', status: 'ready', name: 'September', formats: ['portrait_4_5'] } });
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(await prisma.batchItem.create({
      data: { batchId: batch.id, format: 'portrait_4_5', prompt: 'p', status: 'ready', r2Key: `key-${batch.id}-${i}`, sceneId: `s-${i}`, createdAt: new Date(NOW.getTime() + i * 1000) },
    }));
  }
  return items;
};

const onDay = async (ws: Workspace, date: string) =>
  (await listSlots(ws.id, NOW, FAR)).filter((s) => isoDate(s.scheduledFor) === date);

describe('removing a photo', () => {
  it('stays removed, even though auto-fill runs every time the calendar opens', async () => {
    const ws = await createTestWorkspace('brand');
    const items = await photos(ws, 2);
    await autoFill(ws, NOW);
    await removeFromCalendar(ws.id, items[0]!.id);

    // This used to delete the row, and the next auto-fill booked the photo straight back.
    expect(await autoFill(ws, NOW)).toBe(0);
    const ids = (await listSlots(ws.id, NOW, FAR)).map((s) => s.itemId);
    expect(ids).toEqual([items[1]!.id]);
  });

  it('by its slot hides it from the calendar and frees the day for another photo', async () => {
    const ws = await createTestWorkspace('brand');
    await photos(ws, 1);
    await autoFill(ws, NOW);
    const [slot] = await listSlots(ws.id, NOW, FAR);
    expect((await removeSlot(ws.id, slot!.id)).status).toBe('removed');
    expect(await listSlots(ws.id, NOW, FAR)).toEqual([]);

    await photos(ws, 1);
    await autoFill(ws, NOW);
    expect(isoDate((await listSlots(ws.id, NOW, FAR))[0]!.scheduledFor)).toBe('2026-09-15');
  });

  it('refuses a post she already marked done, and anyone else’s post', async () => {
    const ws = await createTestWorkspace('brand');
    await photos(ws, 1);
    await autoFill(ws, NOW);
    const [slot] = await listSlots(ws.id, NOW, FAR);
    await expect(removeSlot((await createTestWorkspace('brand')).id, slot!.id)).rejects.toMatchObject({ status: 404 });
    await markPosted(ws.id, slot!.id, null, NOW);
    await expect(removeSlot(ws.id, slot!.id)).rejects.toMatchObject({ status: 409 });
  });

  it('can go back on — on her next open day, not the old one', async () => {
    const ws = await createTestWorkspace('brand');
    const items = await photos(ws, 1);
    const first = await addToCalendar(ws, items[0]!.id, at('2026-09-01T09:00:00Z'));
    expect(isoDate(first.scheduledFor)).toBe('2026-09-01');
    await removeFromCalendar(ws.id, items[0]!.id);
    const again = await addToCalendar(ws, items[0]!.id, NOW);
    expect(again).toMatchObject({ id: first.id, status: 'planned' });
    expect(isoDate(again.scheduledFor)).toBe('2026-09-15');
  });
});

describe('adding photos to a day', () => {
  it('puts several photos on one day', async () => {
    const ws = await createTestWorkspace('brand');
    const items = await photos(ws, 3);
    expect(await addPhotosToDay(ws, '2026-09-18', items.map((i) => i.id), NOW)).toBe(3);
    const slots = await onDay(ws, '2026-09-18');
    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s.status === 'planned' && s.source === 'manual')).toBe(true);
  });

  it('moves a planned photo to the day she picked, brings back a removed one, and leaves a posted one', async () => {
    const ws = await createTestWorkspace('brand');
    const [planned, removed, posted] = await photos(ws, 3);
    await addToCalendar(ws, planned!.id, NOW);
    await addToCalendar(ws, removed!.id, NOW);
    await removeFromCalendar(ws.id, removed!.id);
    const done = await addToCalendar(ws, posted!.id, NOW);
    await markPosted(ws.id, done.id, null, NOW);

    expect(await addPhotosToDay(ws, '2026-09-20', [planned!.id, removed!.id, posted!.id], NOW)).toBe(2);
    expect((await onDay(ws, '2026-09-20')).map((s) => s.itemId).sort()).toEqual([planned!.id, removed!.id].sort());
    expect(await prisma.postSlot.count({ where: { workspaceId: ws.id } })).toBe(3); // one row per photo, always
  });

  it('refuses a past day, a bad date and an empty pick', async () => {
    const ws = await createTestWorkspace('brand');
    const [item] = await photos(ws, 1);
    await expect(addPhotosToDay(ws, '2026-09-14', [item!.id], NOW)).rejects.toMatchObject({ status: 400 });
    await expect(addPhotosToDay(ws, 'soon', [item!.id], NOW)).rejects.toMatchObject({ status: 400 });
    await expect(addPhotosToDay(ws, '2026-09-15', [], NOW)).rejects.toMatchObject({ status: 400 });
    // Today is fine.
    expect(await addPhotosToDay(ws, '2026-09-15', [item!.id], NOW)).toBe(1);
  });

  it('ignores photos that are archived, not ready, or someone else’s', async () => {
    const ws = await createTestWorkspace('brand');
    const [archived, kept] = await photos(ws, 2);
    await prisma.batchItem.update({ where: { id: archived!.id }, data: { archivedAt: NOW } });
    const [theirs] = await photos(await createTestWorkspace('brand'), 1);
    expect(await addPhotosToDay(ws, '2026-09-17', [archived!.id, kept!.id, theirs!.id], NOW)).toBe(1);
  });
});

describe('photos she can add', () => {
  it('lists photos not already planned or posted, newest first, a page at a time', async () => {
    const ws = await createTestWorkspace('brand');
    const items = await photos(ws, 5);
    await addToCalendar(ws, items[0]!.id, NOW); // planned: not listed
    await addToCalendar(ws, items[1]!.id, NOW);
    await removeFromCalendar(ws.id, items[1]!.id); // removed: listed again
    await prisma.batchItem.update({ where: { id: items[2]!.id }, data: { archivedAt: NOW } }); // archived: never

    const first = await listAddablePhotos(ws.id, null, 2);
    expect(first.rows.map((r) => r.id)).toEqual([items[4]!.id, items[3]!.id]);
    expect(first.nextCursor).toBe(items[3]!.id);
    const second = await listAddablePhotos(ws.id, first.nextCursor, 2);
    expect(second.rows.map((r) => r.id)).toEqual([items[1]!.id]);
    expect(second.nextCursor).toBeNull();
  });
});
