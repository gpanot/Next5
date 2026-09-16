import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_MODELS, modelCostUsdMicros } from '../../../src/config/imageModels';
import { prisma } from '../../../src/lib/db';
import { pollModelTest, startModelTest } from '../../../src/server/admin/modelTest';
import { putObject } from '../../../src/server/storage/objectStore';
import { resetBusinessTables } from '../../helpers/db';

let dir = '';
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'next5-bench-'));
  process.env.NEXT5_STORAGE = 'local';
  process.env.NEXT5_STORAGE_DIR = dir;
  process.env.WAVESPEED_API_KEY = 'test-key';
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetBusinessTables();
  await prisma.modelTestRun.deleteMany();
});
afterEach(() => vi.unstubAllGlobals());

const jpeg = () => sharp({ create: { width: 900, height: 1200, channels: 3, background: '#c8b9d2' } }).jpeg().toBuffer();

/** WaveSpeed stand-in: upload → URL, submit → task id per model, poll → completed, download → a JPEG. */
const stubWaveSpeed = (submitted: string[]) => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/media/upload/binary')) return Response.json({ code: 200, data: { download_url: 'https://cdn.test/input.jpg' } });
    if (url.includes('/predictions/')) return Response.json({ code: 200, data: { status: 'completed', outputs: ['https://cdn.test/out.jpg'], error: '' } });
    if (url.startsWith('https://cdn.test/out.jpg')) return new Response(new Uint8Array(await jpeg()));
    submitted.push(url);
    return Response.json({ code: 200, data: { id: `task-${submitted.length}` } });
  }));
};

describe('admin model bench', () => {
  it('runs one prompt through several models and records the photo, time and price', async () => {
    const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'shop', isActive: true } });
    await putObject('bench/face.jpg', await jpeg());
    await putObject('bench/front.jpg', await jpeg());
    const submitted: string[] = [];
    stubWaveSpeed(submitted);

    const run = await startModelTest({
      identityKeys: ['bench/face.jpg'],
      productKeys: ['bench/front.jpg'],
      templateId: template.id,
      shot: 'full_body_front',
      format: 'square_1_1',
      resolution: '1k',
      models: ['nano-banana-2', 'seedream-v5-pro'],
      product: { name: 'Leopard dress', category: 'dress', colorName: 'brown', fit: null, notes: null },
    });

    // The prompt is the real drop prompt, and each model is called on its own endpoint.
    expect(run.prompt).toContain('Leopard dress');
    expect(submitted.some((u) => u.includes(IMAGE_MODELS['nano-banana-2'].path))).toBe(true);
    expect(submitted.some((u) => u.includes(IMAGE_MODELS['seedream-v5-pro'].path))).toBe(true);

    const polled = await pollModelTest(run.id);
    expect(polled.items.map((i) => i.status)).toEqual(['ready', 'ready']);
    expect(polled.items.every((i) => i.url && i.seconds !== null && i.seconds >= 0)).toBe(true);
    expect(polled.items.find((i) => i.model === 'seedream-v5-pro')?.costUsdMicros).toBe(modelCostUsdMicros('seedream-v5-pro', '1k', 2));
    expect(polled.items.find((i) => i.model === 'nano-banana-2')?.costUsdMicros).toBe(70_000);
  });

  it('marks a model failed without stopping the others', async () => {
    const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'shop', isActive: true } });
    await putObject('bench/face2.jpg', await jpeg());
    await putObject('bench/front2.jpg', await jpeg());
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/media/upload/binary')) return Response.json({ code: 200, data: { download_url: 'https://cdn.test/input.jpg' } });
      if (url.includes(IMAGE_MODELS['qwen-image'].path)) return Response.json({ code: 400, message: 'model unavailable' }, { status: 400 });
      if (url.includes('/predictions/')) return Response.json({ code: 200, data: { status: 'failed', outputs: [], error: 'Content flagged as potentially sensitive' } });
      return Response.json({ code: 200, data: { id: 'task-x' } });
    }));

    const run = await startModelTest({
      identityKeys: ['bench/face2.jpg'],
      productKeys: ['bench/front2.jpg'],
      templateId: template.id,
      shot: 'half_body',
      format: 'square_1_1',
      resolution: '1k',
      models: ['qwen-image', 'nano-banana-2'],
      product: { name: 'Lace set', category: 'set', colorName: null, fit: null, notes: null },
    });

    const polled = await pollModelTest(run.id);
    const qwen = polled.items.find((i) => i.model === 'qwen-image');
    const nano = polled.items.find((i) => i.model === 'nano-banana-2');
    expect(qwen).toMatchObject({ status: 'failed' });
    expect(qwen?.error).toContain('model unavailable');
    expect(nano).toMatchObject({ status: 'failed' });
    expect(nano?.error).toContain('flagged');
  });
});
