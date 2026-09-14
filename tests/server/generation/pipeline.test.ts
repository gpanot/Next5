import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { getBalance, grant } from '../../../src/server/credits/ledger';
import { withSerializable } from '../../../src/server/db/transaction';
import { createBatch } from '../../../src/server/generation/createBatch';
import { failItem } from '../../../src/server/generation/finalize';
import { DIGITAL_SOURCE_TYPE } from '../../../src/server/generation/labeling';
import { poll } from '../../../src/server/generation/poll';
import { pump } from '../../../src/server/generation/pump';
import { redoItem } from '../../../src/server/generation/redo';
import { getObject, putObject } from '../../../src/server/storage/objectStore';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

let dir = '';

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'next5-store-'));
  process.env.NEXT5_STORAGE = 'local';
  process.env.NEXT5_STORAGE_DIR = dir;
  process.env.NEXT5_MOCK_GENERATION = 'true';
  process.env.NEXT5_MOCK_GENERATION_DELAY_MS = '0';
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await prisma.$disconnect();
});
beforeEach(resetBusinessTables);

const sampleJpeg = () =>
  sharp({ create: { width: 400, height: 500, channels: 3, background: '#c9b9a6' } }).jpeg().toBuffer();

const setupBrand = async (credits: number) => {
  const ws = await createTestWorkspace('brand');
  await putObject(`ws/${ws.id}/identity/face1.jpg`, await sampleJpeg());
  await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: `ws/${ws.id}/identity/face1.jpg` } });
  const set = await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: 'modern-office', name: 'Office', locations: ['glass-meeting-room'] } });
  await withSerializable((tx) => grant(tx, { workspaceId: ws.id, bucket: 'topup', amount: credits, reason: 'topup_grant', refType: 'payment', refId: `p-${ws.id}`, expiresAt: null }));
  return { ws, set };
};

const drain = async (batchId: string) => {
  for (let i = 0; i < 20; i += 1) {
    await pump({ batchId });
    await poll({ batchId });
    const open = await prisma.batchItem.count({ where: { batchId, status: { in: ['queued', 'submitting', 'generating'] } } });
    if (open === 0) return;
  }
  throw new Error('batch did not finish');
};

describe('generation pipeline (mock mode)', () => {
  it('creates, reserves, generates and labels every item', async () => {
    const { ws, set } = await setupBrand(20);
    const batch = await createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: false });
    expect(batch.creditsReserved).toBe(8);
    expect((await getBalance(ws.id)).total).toBe(12);

    await drain(batch.id);
    const items = await prisma.batchItem.findMany({ where: { batchId: batch.id } });
    expect(items.every((i) => i.status === 'ready' && i.r2Key)).toBe(true);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).status).toBe('ready');

    const stored = await getObject(items[0]!.r2Key!);
    expect(stored?.toString('latin1')).toContain(DIGITAL_SOURCE_TYPE);
  });

  it('refuses high-res without a Pro plan and batches larger than the balance', async () => {
    const { ws, set } = await setupBrand(5);
    await expect(createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: true })).rejects.toMatchObject({ status: 403 });
    await expect(createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: false })).rejects.toMatchObject({ name: 'InsufficientCreditsError' });
    expect(await prisma.batch.count()).toBe(0);
  });

  it('never claims the same item twice under concurrent pumps', async () => {
    const { ws, set } = await setupBrand(40);
    const batch = await createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 16, formats: ['portrait_4_5'], highRes: false });
    const [a, b] = await Promise.all([pump({ batchId: batch.id }), pump({ batchId: batch.id })]);
    const generating = await prisma.batchItem.count({ where: { batchId: batch.id, status: 'generating' } });
    expect(a + b).toBe(generating);
    expect(generating).toBeLessThanOrEqual(12);
  });

  it('retries once, then fails and refunds a paid run', async () => {
    const { ws, set } = await setupBrand(8);
    const batch = await createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: false });
    await pump({ batchId: batch.id });
    let item = await prisma.batchItem.findFirstOrThrow({ where: { batchId: batch.id, status: 'generating' } });
    await failItem(item, 'boom');
    expect((await prisma.batchItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('queued');

    await prisma.batchItem.update({ where: { id: item.id }, data: { status: 'generating', attempts: 2 } });
    item = await prisma.batchItem.findUniqueOrThrow({ where: { id: item.id } });
    await failItem(item, 'boom again');
    expect((await prisma.batchItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('failed');
    expect((await getBalance(ws.id)).total).toBe(1);
  });

  it('gives two free redos, then charges, and never refunds a free redo', async () => {
    const { ws, set } = await setupBrand(9);
    const batch = await createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: false });
    await drain(batch.id);
    const item = await prisma.batchItem.findFirstOrThrow({ where: { batchId: batch.id } });
    const redo = () => redoItem({ workspaceId: ws.id, batchId: batch.id, itemId: item.id, reason: 'not_like_me' });

    expect((await redo()).charged).toBe(false);
    // A free redo that fails must not refund anything.
    await pump({ batchId: batch.id });
    const running = await prisma.batchItem.findUniqueOrThrow({ where: { id: item.id } });
    await failItem({ ...running, attempts: 2 }, 'fail');
    expect((await getBalance(ws.id)).total).toBe(1);

    expect((await redo()).charged).toBe(false);
    await drain(batch.id);
    const third = await redo();
    expect(third.charged).toBe(true);
    expect((await getBalance(ws.id)).total).toBe(0);
  });
});

describe('Scroll-Stop Score and Post Kit', () => {
  it('scores every finished photo and writes a Post Kit for trial photos', async () => {
    const { getPostKit } = await import('../../../src/server/postKit/postKit');
    const { ws, set } = await setupBrand(20);
    const batch = await createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 2, formats: ['portrait_4_5'], highRes: false });
    await drain(batch.id);
    const items = await prisma.batchItem.findMany({ where: { batchId: batch.id } });
    expect(items.every((i) => typeof i.score === 'number' && i.score >= 0 && i.score <= 100)).toBe(true);

    // No Growth plan and not a trial → locked.
    await expect(getPostKit(ws.ownerUserId, items[0]!.id)).rejects.toMatchObject({ status: 403 });
    await prisma.batch.update({ where: { id: batch.id }, data: { kind: 'trial' } });
    const kit = await getPostKit(ws.ownerUserId, items[0]!.id);
    expect(kit.hook.length).toBeGreaterThan(5);
    expect(kit.hashtags.length).toBeGreaterThan(3);
    expect((await prisma.batchItem.findUniqueOrThrow({ where: { id: items[0]!.id } })).postKit).toMatchObject({ hook: kit.hook });
  });
});
