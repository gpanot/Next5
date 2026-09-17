import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { expandDraft } from '../../../src/server/generation/expand';
import { parseDraft } from '../../../src/server/generation/draft';
import { archiveListing, getListing, listListings, removeRoom, replaceRoom, toListingDto } from '../../../src/server/listings/listings';
import { addZillowPhotos, refreshZillowImport, startZillowImport, startZillowSync } from '../../../src/server/listings/zillowImport';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

const LINK = 'https://www.zillow.com/homedetails/2720-Carolyn-Dr-SE-Smyrna-GA-30080/14312548_zpid/?utm_campaign=share';
const SOLD = 'https://www.zillow.com/homedetails/7314-E-Fillmore-St-Scottsdale-AZ-85257/7579008_zpid/';

let dir = '';
let jpeg: Buffer;
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'next5-zillow-'));
  process.env.NEXT5_STORAGE = 'local';
  process.env.NEXT5_STORAGE_DIR = dir;
  process.env.NEXT5_ZILLOW_IMPORT_MOCK = 'true';
  jpeg = await sharp({ create: { width: 800, height: 532, channels: 3, background: '#e8e2d8' } }).jpeg().toBuffer();
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetBusinessTables();
  // Zillow's photo CDN: every photo is the same 800×532 JPEG.
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(jpeg))));
});
afterEach(() => vi.unstubAllGlobals());

const imported = async (link = LINK) => {
  const ws = await createTestWorkspace('brand');
  const listing = await refreshZillowImport(await startZillowImport(ws, link, true));
  return { ws, listing };
};

describe('Zillow import', () => {
  it('needs a Zillow home link, her declaration and a Brand workspace', async () => {
    const ws = await createTestWorkspace('brand');
    await expect(startZillowImport(ws, 'https://www.zillow.com/austin-tx/', true)).rejects.toMatchObject({ code: 'invalid_zillow_url' });
    await expect(startZillowImport(ws, LINK, false)).rejects.toMatchObject({ code: 'attest_required' });
    const shop = await createTestWorkspace('shop');
    await expect(startZillowImport(shop, LINK, true)).rejects.toMatchObject({ status: 400 });
  });

  it('shows the property at once, then brings in every photo once, even when the webhook and the poll race', async () => {
    const ws = await createTestWorkspace('brand');
    const started = await startZillowImport(ws, LINK, true);
    expect(started).toMatchObject({ source: 'zillow', zpid: '14312548', importStatus: 'fetching', runId: 'mock-zillow-14312548' });
    expect(started.attestedAt).toBeInstanceOf(Date);

    // She sees it loading in her list, but it can't make photos yet.
    const loading = await listListings(ws.id);
    expect(loading).toHaveLength(1);
    expect((await toListingDto(loading[0]!)).importStatus).toBe('fetching');
    await expect(getListing(ws.id, started.id)).rejects.toMatchObject({ status: 404 });

    await Promise.all([refreshZillowImport(started), refreshZillowImport(started)]);
    const listing = await getListing(ws.id, started.id);
    expect(listing).toMatchObject({ importStatus: 'ready', runId: null, label: '2720 Carolyn Dr SE', priceCents: 39_900_000, beds: 3, status: 'just_listed' });
    expect(listing.materials).toHaveLength(20);
    expect(listing.materials[0]).toMatchObject({ kind: 'listing', width: 800, height: 532 });
    expect(listing.materials.map((m) => m.sourceUrl)).toEqual((listing.candidates as { url: string }[]).map((c) => c.url));

    const dto = await toListingDto(listing);
    // Zillow says it is just listed, so Create starts there; she can still change it.
    expect(dto).toMatchObject({ facts: '$399,000 · 3 bd · 2 ba · 1,350 sqft', statusLabel: 'Just listed', occasion: 'just_listed' });
    expect(dto.rooms.every((r) => r.fromZillow && r.lowRes)).toBe(true);
    expect(dto.candidates.every((c) => c.imported)).toBe(true);

    // The same home again returns the property she has.
    expect((await startZillowImport(ws, LINK, true)).id).toBe(listing.id);
  });

  it('caps a big gallery at 60 photos', async () => {
    const { ws, listing } = await imported(SOLD);
    expect((await getListing(ws.id, listing.id)).materials).toHaveLength(60);
    expect((await toListingDto(await getListing(ws.id, listing.id))).candidates.filter((c) => !c.imported)).toHaveLength(3);
  });

  it('lets her remove photos and add them back from Zillow', async () => {
    const { ws, listing } = await imported();
    const property = await getListing(ws.id, listing.id);
    for (const m of property.materials.slice(0, 3)) await removeRoom(ws.id, m.id);
    const dto = await toListingDto(await getListing(ws.id, listing.id));
    expect(dto.rooms).toHaveLength(17);
    const removed = dto.candidates.filter((c) => !c.imported);
    expect(removed).toHaveLength(3);

    await expect(addZillowPhotos(ws, listing.id, [])).rejects.toMatchObject({ code: 'no_photos' });
    await addZillowPhotos(ws, listing.id, [removed[0]!.id, dto.candidates.find((c) => c.imported)!.id]);
    expect((await getListing(ws.id, listing.id)).materials).toHaveLength(18);
  });

  it('builds a listing batch only from the photos she kept', async () => {
    const { ws, listing } = await imported();
    const property = await getListing(ws.id, listing.id);
    for (const m of property.materials.slice(2)) await removeRoom(ws.id, m.id);
    await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: 'face.jpg' } });
    // A property batch needs no set and no theme — only what is happening with the home.
    const draft = parseDraft({ product: 'brand', kind: 'brand_property', formats: ['portrait_4_5'], listingId: listing.id, occasion: 'just_listed', variations: 2 });
    const expanded = await expandDraft(ws, draft);
    expect(expanded.items).toHaveLength(4);
    expect(expanded.items.every((i) => i.materialId)).toBe(true);
  });

  it('refreshes status and price without adding back photos she removed', async () => {
    const { ws, listing } = await imported();
    await prisma.listing.update({ where: { id: listing.id }, data: { label: 'My listing', status: 'for_sale', priceCents: 1 } });
    await removeRoom(ws.id, (await getListing(ws.id, listing.id)).materials[0]!.id);

    const syncing = await startZillowSync(ws, listing.id);
    expect((await toListingDto(syncing)).syncing).toBe(true);
    const synced = await refreshZillowImport(syncing);
    expect(synced).toMatchObject({ importStatus: 'ready', label: 'My listing', status: 'just_listed', priceCents: 39_900_000, runId: null });
    expect((await getListing(ws.id, listing.id)).materials).toHaveLength(19);
  });

  it('lets her replace an imported photo with her original', async () => {
    const { ws, listing } = await imported();
    const [room] = (await getListing(ws.id, listing.id)).materials;
    await replaceRoom(ws.id, listing.id, room!.id, jpeg, { width: 3000, height: 2000 });
    const dto = await toListingDto(await getListing(ws.id, listing.id));
    expect(dto.rooms[0]).toMatchObject({ id: room!.id, fromZillow: false, lowRes: false });
  });

  it('marks a failed import so she can retry or remove it', async () => {
    const ws = await createTestWorkspace('brand');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 403 })));
    const failed = await refreshZillowImport(await startZillowImport(ws, LINK, true));
    expect(failed).toMatchObject({ importStatus: 'failed', runId: null });
    expect(failed.importError).toMatch(/could not download/);

    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(jpeg))));
    const retried = await startZillowImport(ws, LINK, true);
    expect(retried).toMatchObject({ id: failed.id, importStatus: 'fetching', runId: 'mock-zillow-14312548' });
    expect(await refreshZillowImport(retried)).toMatchObject({ importStatus: 'ready' });

    await archiveListing(ws.id, failed.id);
    expect(await listListings(ws.id)).toHaveLength(0);
  });

  it('fails a stuck import, and keeps a ready property usable when a refresh gets stuck', async () => {
    const { ws, listing } = await imported();
    const stale = new Date(Date.now() - 10 * 60_000);
    await prisma.listing.update({ where: { id: listing.id }, data: { runId: 'ingesting:old', updatedAt: stale } });
    const kept = await refreshZillowImport(await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } }));
    expect(kept).toMatchObject({ importStatus: 'ready', runId: null });
    expect(kept.importError).toBeTruthy();
    expect((await getListing(ws.id, listing.id)).materials).toHaveLength(20);

    const other = await startZillowImport(ws, SOLD, true);
    await prisma.listing.update({ where: { id: other.id }, data: { runId: 'ingesting:old', updatedAt: stale } });
    expect(await refreshZillowImport(await prisma.listing.findUniqueOrThrow({ where: { id: other.id } }))).toMatchObject({ importStatus: 'failed' });
  });
});
