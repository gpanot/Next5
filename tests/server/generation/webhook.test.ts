import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { withSerializable } from '../../../src/server/db/transaction';
import { grant } from '../../../src/server/credits/ledger';
import { createBatch } from '../../../src/server/generation/createBatch';
import { pump } from '../../../src/server/generation/pump';
import { handleWaveSpeedWebhook, verifyWaveSpeedSignature } from '../../../src/server/generation/webhook';
import { putObject } from '../../../src/server/storage/objectStore';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

let dir = '';
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'next5-webhook-'));
  process.env.NEXT5_STORAGE = 'local';
  process.env.NEXT5_STORAGE_DIR = dir;
  process.env.NEXT5_MOCK_GENERATION = 'true';
  process.env.NEXT5_MOCK_GENERATION_DELAY_MS = '600000'; // mock tasks never self-complete: only webhooks finish items
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await prisma.$disconnect();
});
beforeEach(resetBusinessTables);
afterEach(() => vi.unstubAllGlobals());

const jpeg = () => sharp({ create: { width: 400, height: 500, channels: 3, background: '#c9b9a6' } }).jpeg().toBuffer();

describe('verifyWaveSpeedSignature', () => {
  const secret = 'whsec_testsecret';
  const body = '{"id":"t1","status":"completed"}';
  const sign = (id: string, ts: string, raw: string) => `v3,${createHmac('sha256', 'testsecret').update(`${id}.${ts}.${raw}`).digest('hex')}`;

  it('accepts a valid signature and rejects tampering, stale timestamps and bad formats', () => {
    const now = 1_800_000_000;
    const ts = String(now - 10);
    expect(verifyWaveSpeedSignature(body, { id: 'msg_1', timestamp: ts, signature: sign('msg_1', ts, body) }, secret, now)).toBe(true);
    expect(verifyWaveSpeedSignature(`${body} `, { id: 'msg_1', timestamp: ts, signature: sign('msg_1', ts, body) }, secret, now)).toBe(false);
    const old = String(now - 301);
    expect(verifyWaveSpeedSignature(body, { id: 'msg_1', timestamp: old, signature: sign('msg_1', old, body) }, secret, now)).toBe(false);
    expect(verifyWaveSpeedSignature(body, { id: 'msg_1', timestamp: ts, signature: 'v1,abc' }, secret, now)).toBe(false);
  });
});

describe('handleWaveSpeedWebhook', () => {
  const setup = async (count: number, concurrency: string) => {
    process.env.GENERATION_MAX_CONCURRENT = concurrency;
    const ws = await createTestWorkspace('brand');
    await putObject(`ws/${ws.id}/identity/face1.jpg`, await jpeg());
    await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: `ws/${ws.id}/identity/face1.jpg` } });
    const set = await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: 'modern-office', name: 'Office', locations: ['glass-meeting-room'] } });
    await withSerializable((tx) => grant(tx, { workspaceId: ws.id, bucket: 'topup', amount: 50, reason: 'topup_grant', refType: 'payment', refId: `p-${ws.id}`, expiresAt: null }));
    return createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count, formats: ['portrait_4_5'], highRes: false });
  };

  it('finalizes on completed, is idempotent, and ignores unknown tasks', async () => {
    const batch = await setup(1, '6');
    await pump({ batchId: batch.id });
    const item = await prisma.batchItem.update({ where: { id: (await prisma.batchItem.findFirstOrThrow({ where: { batchId: batch.id } })).id }, data: { wavespeedTaskId: 'ws-task-1' } });
    const image = await jpeg();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(image))));

    const payload = { id: 'ws-task-1', status: 'completed', outputs: ['https://cdn.example/out.jpg'] };
    expect(await handleWaveSpeedWebhook(payload, { retryDelaysMs: [] })).toBe('handled');
    const ready = await prisma.batchItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(ready.status).toBe('ready');
    expect(ready.r2Key).toBeTruthy();
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).status).toBe('ready');

    expect(await handleWaveSpeedWebhook(payload, { retryDelaysMs: [] })).toBe('ignored');
    expect(await handleWaveSpeedWebhook({ id: 'consumer-task', status: 'completed' }, { retryDelaysMs: [] })).toBe('ignored');
  });

  it('requeues a failed task and frees the slot for the next queued item', async () => {
    const batch = await setup(3, '1');
    await pump({ batchId: batch.id });
    const first = await prisma.batchItem.findFirstOrThrow({ where: { batchId: batch.id, status: 'generating' } });
    await prisma.batchItem.update({ where: { id: first.id }, data: { wavespeedTaskId: 'ws-task-fail' } });

    await handleWaveSpeedWebhook({ id: 'ws-task-fail', status: 'failed', error: 'nsfw' }, { retryDelaysMs: [] });
    const after = await prisma.batchItem.findUniqueOrThrow({ where: { id: first.id } });
    expect(after.errorMessage).toBe('nsfw');
    // The freed slot was re-used straight away: exactly one item is in flight again.
    expect(await prisma.batchItem.count({ where: { batchId: batch.id, status: 'generating' } })).toBe(1);
  });

  it('finds an item whose task id was saved just after the callback arrived', async () => {
    const batch = await setup(1, '6');
    await pump({ batchId: batch.id });
    const item = await prisma.batchItem.findFirstOrThrow({ where: { batchId: batch.id } });
    setTimeout(() => { prisma.batchItem.update({ where: { id: item.id }, data: { wavespeedTaskId: 'ws-late' } }).then(() => undefined, () => undefined); }, 50);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(await jpeg()))));
    expect(await handleWaveSpeedWebhook({ id: 'ws-late', status: 'completed', outputs: ['https://cdn.example/x.jpg'] }, { retryDelaysMs: [300] })).toBe('handled');
  });
});

describe('stuck slots', () => {
  it('a batch page tick recovers long-silent tasks from other batches that hold every slot', async () => {
    const { runGenerationTick } = await import('../../../src/server/generation/poll');
    process.env.NEXT5_MOCK_GENERATION_DELAY_MS = '0';
    process.env.GENERATION_MAX_CONCURRENT = '1';
    const ws = await createTestWorkspace('brand');
    await putObject(`ws/${ws.id}/identity/face1.jpg`, await jpeg());
    await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: `ws/${ws.id}/identity/face1.jpg` } });
    const set = await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: 'modern-office', name: 'Office', locations: ['glass-meeting-room'] } });
    await withSerializable((tx) => grant(tx, { workspaceId: ws.id, bucket: 'topup', amount: 50, reason: 'topup_grant', refType: 'payment', refId: `p-${ws.id}`, expiresAt: null }));
    const stuck = await createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: false });
    await pump({ batchId: stuck.id });
    await prisma.batchItem.updateMany({ where: { batchId: stuck.id, status: 'generating' }, data: { submittedAt: new Date(Date.now() - 10 * 60 * 1000) } });
    const waiting = await createBatch(ws, { kind: 'brand_theme', setId: set.id, themeId: 'just-listed', count: 8, formats: ['portrait_4_5'], highRes: false });
    await runGenerationTick({ batchId: waiting.id, budgetMs: 5_000 });
    expect(await prisma.batchItem.count({ where: { batchId: waiting.id, status: 'generating' } })).toBe(1);
    process.env.NEXT5_MOCK_GENERATION_DELAY_MS = '600000';
  });
});
