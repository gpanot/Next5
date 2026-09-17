import type { Workspace } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { addToCalendar, autoFill, markPosted, removeFromCalendar } from '../../../src/server/calendar/calendar';
import { isoDate } from '../../../src/server/calendar/schedule';
import { toDetailDto } from '../../../src/server/generation/dto';
import { libraryWhere, listSeries } from '../../../src/server/generation/library';
import { createListing } from '../../../src/server/listings/listings';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const NOW = at('2026-09-15T09:00:00Z'); // a Tuesday; default days Tue, Thu, Sat

const batchOf = async (ws: Workspace, count: number, listingId: string | null = null) => {
  const theme = await prisma.theme.findFirstOrThrow({ where: { isActive: true } });
  const batch = await prisma.batch.create({
    data: { workspaceId: ws.id, kind: 'brand_theme', status: 'ready', name: listingId ? '2720 Carolyn Dr SE · Sep 15' : 'September', formats: ['portrait_4_5'], listingId, themeId: theme.id },
  });
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(await prisma.batchItem.create({
      data: { batchId: batch.id, format: 'portrait_4_5', prompt: 'p', status: 'ready', r2Key: `key-${batch.id}-${i}`, score: 80, scoreDetails: { version: 1, criteria: {}, tip: 't', bestFor: 'feed' }, sceneId: `s-${i}` },
    }));
  }
  return { batch, items };
};

const property = async (ws: Workspace) => {
  const listing = await createListing(ws, { label: '2720 Carolyn Dr SE', attest: true, visibleAiTag: false });
  return prisma.listing.update({ where: { id: listing.id }, data: { source: 'zillow' } });
};

describe('photos made from a property', () => {
  it('stay off the calendar until she adds them, while theme photos still fill in', async () => {
    const ws = await createTestWorkspace('brand');
    const listing = await property(ws);
    await batchOf(ws, 3, listing.id);
    await batchOf(ws, 2);
    expect(await autoFill(ws, NOW)).toBe(2);
    expect(await prisma.postSlot.count({ where: { item: { batch: { listingId: listing.id } } } })).toBe(0);
  });

  it('go on her next open posting day when she taps Add to calendar, once', async () => {
    const ws = await createTestWorkspace('brand');
    const { batch, items } = await batchOf(ws, 2, (await property(ws)).id);
    const first = await addToCalendar(ws, items[0]!.id, NOW);
    expect(first).toMatchObject({ source: 'manual', status: 'planned' });
    expect(isoDate(first.scheduledFor)).toBe('2026-09-15');
    expect((await addToCalendar(ws, items[0]!.id, NOW)).id).toBe(first.id);
    expect(isoDate((await addToCalendar(ws, items[1]!.id, NOW)).scheduledFor)).toBe('2026-09-17');

    const dto = await toDetailDto(batch);
    expect(dto.listingId).toBeTruthy();
    expect(dto.items.map((i) => i.calendar?.date)).toEqual(['2026-09-15', '2026-09-17']);

    await removeFromCalendar(ws.id, items[1]!.id);
    expect((await toDetailDto(batch)).items[1]!.calendar).toBeNull();
  });

  it('keeps a post she already marked done when she takes the photo off', async () => {
    const ws = await createTestWorkspace('brand');
    const { items } = await batchOf(ws, 1, (await property(ws)).id);
    const slot = await addToCalendar(ws, items[0]!.id, NOW);
    await markPosted(ws.id, slot.id, null, NOW);
    await removeFromCalendar(ws.id, items[0]!.id);
    expect(await prisma.postSlot.count({ where: { id: slot.id } })).toBe(1);
  });
});

describe('archived photos', () => {
  it('leave the batch, the library, auto-fill and Add to calendar', async () => {
    const ws = await createTestWorkspace('brand');
    const { batch, items } = await batchOf(ws, 3);
    await prisma.batchItem.update({ where: { id: items[0]!.id }, data: { archivedAt: NOW } });

    expect((await toDetailDto(batch)).items).toHaveLength(2);
    expect(await prisma.batchItem.count({ where: libraryWhere({ workspaceId: ws.id }) })).toBe(2);
    expect(await autoFill(ws, NOW)).toBe(2);
    await expect(addToCalendar(ws, items[0]!.id, NOW)).rejects.toMatchObject({ status: 404 });
  });
});

describe('library series', () => {
  it('groups photos by generation, filters by what they were made for, and skips empty series', async () => {
    const ws = await createTestWorkspace('brand');
    const listing = await property(ws);
    const home = await batchOf(ws, 2, listing.id);
    await batchOf(ws, 3);
    const empty = await batchOf(ws, 1);
    await prisma.batchItem.updateMany({ where: { batchId: empty.batch.id }, data: { archivedAt: NOW } });
    await addToCalendar(ws, home.items[0]!.id, NOW);

    const all = await listSeries(ws.id, 'all', null);
    expect(all.batches).toHaveLength(2);
    const properties = await listSeries(ws.id, 'property', null);
    expect(properties.batches.map((b) => [b.listing?.label, b.listing?.source, b.items.length, b.items.filter((i) => i._count.slots > 0).length])).toEqual([['2720 Carolyn Dr SE', 'zillow', 2, 1]]);
    expect((await listSeries(ws.id, 'theme', null)).batches).toHaveLength(1);
  });
});
