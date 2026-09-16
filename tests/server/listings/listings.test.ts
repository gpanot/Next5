import type { Workspace } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { expandDraft } from '../../../src/server/generation/expand';
import { parseDraft } from '../../../src/server/generation/draft';
import { addRoom, archiveListing, clampVariations, createListing, getListing, listListings, removeRoom } from '../../../src/server/listings/listings';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const png = Buffer.from('89504e470d0a1a0a', 'hex');
const NOW = at('2026-09-16T10:00:00Z');

/** A brand workspace with selfies, a set and a theme — everything a batch needs. */
const ready = async () => {
  const ws = await createTestWorkspace('brand');
  const template = await prisma.setTemplate.findFirstOrThrow();
  const set = await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: template.id, name: 'My set', locations: [], status: 'active' } });
  await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: 'face.jpg' } });
  const theme = await prisma.theme.findFirstOrThrow({ where: { isActive: true } });
  return { ws, setId: set.id, themeId: theme.id };
};

const withRooms = async (ws: Workspace, count: number) => {
  const listing = await createListing(ws, { label: '2720 Ashford Dr', attest: true, visibleAiTag: false });
  for (let i = 0; i < count; i += 1) await addRoom(ws, listing.id, png, `room-${i}`);
  return listing;
};

describe('listings', () => {
  it('needs her to confirm she represents the property', async () => {
    const ws = await createTestWorkspace('brand');
    await expect(createListing(ws, { label: '2720 Ashford Dr', attest: false, visibleAiTag: false })).rejects.toMatchObject({ status: 400 });
    await expect(createListing(ws, { label: '  ', attest: true, visibleAiTag: false })).rejects.toMatchObject({ status: 400 });
  });

  it('is Brand only, and keeps the visible label off unless she asks', async () => {
    const shop = await createTestWorkspace('shop');
    await expect(createListing(shop, { label: 'x', attest: true, visibleAiTag: false })).rejects.toMatchObject({ status: 400 });

    const ws = await createTestWorkspace('brand');
    expect((await createListing(ws, { label: '2720', attest: true, visibleAiTag: false })).visibleAiTag).toBe(false);
    expect((await createListing(ws, { label: '2721', attest: true, visibleAiTag: true })).visibleAiTag).toBe(true);
  });

  it('holds its rooms, and lets her take one out', async () => {
    const ws = await createTestWorkspace('brand');
    const listing = await withRooms(ws, 3);
    expect((await getListing(ws.id, listing.id)).materials).toHaveLength(3);

    const [first] = (await getListing(ws.id, listing.id)).materials;
    await removeRoom(ws.id, first!.id);
    expect((await getListing(ws.id, listing.id)).materials).toHaveLength(2);

    await archiveListing(ws.id, listing.id);
    expect(await listListings(ws.id)).toEqual([]);
  });

  it('will not reach into another workspace', async () => {
    const mine = await createTestWorkspace('brand');
    const theirs = await createTestWorkspace('brand');
    const listing = await withRooms(theirs, 1);
    await expect(getListing(mine.id, listing.id)).rejects.toMatchObject({ status: 404 });
  });

  it('keeps looks per room between 1 and 3', () => {
    expect(clampVariations(2)).toBe(2);
    expect(clampVariations(9)).toBe(3);
    expect(clampVariations(0)).toBe(1);
    expect(clampVariations('nonsense')).toBe(2);
  });
});

describe('listing mode never invents a room', () => {
  it('makes one photo per room per look, and no more', async () => {
    const { ws, setId, themeId } = await ready();
    const listing = await withRooms(ws, 3);

    const expanded = await expandDraft(ws, { kind: 'brand_theme', setId, themeId, count: 0, formats: ['portrait_4_5'], highRes: false, listingId: listing.id, variations: 2 }, NOW);
    expect(expanded.items).toHaveLength(6); // 3 rooms × 2 looks
    expect(expanded.listingId).toBe(listing.id);
    expect(expanded.name).toContain('2720 Ashford Dr');

    // Every single photo is built from one of her rooms — none is an invented setting.
    expect(expanded.items.every((i) => i.materialId !== null)).toBe(true);
    expect(expanded.items.every((i) => i.inputR2Keys.length === 2)).toBe(true);
    expect(expanded.items.every((i) => i.prompt.includes('Image 2 shows a real property'))).toBe(true);
    expect(expanded.items.some((i) => i.prompt.includes('Setting:'))).toBe(false);

    // Each room is used exactly `variations` times.
    const perRoom = new Map<string, number>();
    for (const item of expanded.items) perRoom.set(item.materialId!, (perRoom.get(item.materialId!) ?? 0) + 1);
    expect([...perRoom.values()]).toEqual([2, 2, 2]);
  });

  it('refuses to run when the property has no photos', async () => {
    const { ws, setId, themeId } = await ready();
    const listing = await createListing(ws, { label: 'Empty', attest: true, visibleAiTag: false });
    await expect(
      expandDraft(ws, { kind: 'brand_theme', setId, themeId, count: 0, formats: ['portrait_4_5'], highRes: false, listingId: listing.id, variations: 2 }, NOW),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('caps the looks per room even if the request asks for more', async () => {
    const { ws, setId, themeId } = await ready();
    const listing = await withRooms(ws, 2);
    const expanded = await expandDraft(ws, { kind: 'brand_theme', setId, themeId, count: 0, formats: ['portrait_4_5'], highRes: false, listingId: listing.id, variations: 99 }, NOW);
    expect(expanded.items).toHaveLength(6); // 2 rooms × 3, the cap
  });

  it('multiplies by formats, not by a count she typed', async () => {
    const { ws, setId, themeId } = await ready();
    const listing = await withRooms(ws, 2);
    const expanded = await expandDraft(ws, { kind: 'brand_theme', setId, themeId, count: 32, formats: ['portrait_4_5', 'square_1_1'], highRes: false, listingId: listing.id, variations: 1 }, NOW);
    expect(expanded.items).toHaveLength(4); // 2 rooms × 1 look × 2 formats — the 32 is ignored
  });

  it('leaves ordinary brand batches on their stock settings', async () => {
    const { ws, setId, themeId } = await ready();
    const expanded = await expandDraft(ws, { kind: 'brand_theme', setId, themeId, count: 8, formats: ['portrait_4_5'], highRes: false }, NOW);
    expect(expanded.items).toHaveLength(8);
    expect(expanded.items.every((i) => i.materialId === null)).toBe(true);
    expect(expanded.items.every((i) => i.prompt.includes('Setting:'))).toBe(true);
  });
});

describe('parseDraft', () => {
  it('takes the count from the rooms in listing mode', () => {
    const draft = parseDraft({ kind: 'brand_theme', setId: 's', themeId: 't', formats: ['portrait_4_5'], listingId: 'l1', variations: 3 });
    expect(draft).toMatchObject({ listingId: 'l1', variations: 3, count: 0 });
  });

  it('still requires a valid count without a property', () => {
    expect(() => parseDraft({ kind: 'brand_theme', setId: 's', themeId: 't', formats: ['portrait_4_5'], count: 7 })).toThrow(/8, 16, 24 or 32/);
  });
});
