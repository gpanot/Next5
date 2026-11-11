import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutoPhoto } from '../../../src/types/admin/autoSlideshow';

const submitted: string[] = [];
const results = new Map<string, () => { status: string; url: string | null; error: string | null }>();
let flaws: (string | null)[] = [];

vi.mock('../../../src/lib/reapiImage', () => ({
  submitReapiImage: vi.fn(async ({ model }: { model: string }) => {
    submitted.push(model);
    return { taskId: `${model}-${submitted.length}`, cost: { usdMicros: 1 } };
  }),
  pollGeminiImage: vi.fn(async (taskId: string) => (results.get(taskId.replace(/-\d+$/, '')) ?? (() => ({ status: 'completed', url: 'https://x/y.jpg', error: null })))()),
}));
vi.mock('../../../src/server/storage/objectStore', () => ({
  putObject: vi.fn(async () => undefined),
  getObject: vi.fn(async () => null),
  presignObject: vi.fn(async (k: string) => `https://r2/${k}`),
}));
vi.mock('../../../src/server/autoSlideshow/heads', () => ({
  detectHeads: vi.fn(async () => []),
  inspectPhoto: vi.fn(async () => ({ heads: [], flaw: flaws.shift() ?? null })),
}));
vi.mock('../../../src/server/autoSlideshow/jpeg', () => ({ compressJpeg: vi.fn(async (b: Buffer) => b), PHOTO_SIZE: { width: 1, height: 1 } }));

const realSetTimeout = globalThis.setTimeout;
const MUSE = 'reapi-muse-image';
const GPT = 'reapi-gpt-image-2.5-official';
const meter = { add: vi.fn(), summary: vi.fn() };
const old: AutoPhoto[] = [
  { prompt: 'kept', imageKey: 'a.jpg', error: null },
  { prompt: 'failed before', imageKey: null, error: 'refused', refs: ['face.jpg'] },
];

const makeNew = async (spec: { prompt: string; refs?: string[] } = { prompt: 'new one' }) => {
  const { makePhotos } = await import('../../../src/server/autoSlideshow/photos');
  const specs = [...old.map((p) => p.prompt), spec];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the meter is only called through add()
  return makePhotos('run', specs, old, meter as any, { onlyFrom: old.length, oneRedo: true });
};

describe('"Generate New" makes one photo with one redo', () => {
  beforeEach(() => {
    vi.resetModules();
    submitted.length = 0;
    results.clear();
    flaws = [];
    // The poll waits of photos.ts, without the wait.
    vi.stubGlobal('setTimeout', (fn: () => void) => realSetTimeout(fn, 0));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1]))));
  });

  it('leaves photos that failed earlier alone', async () => {
    const all = await makeNew();
    expect(submitted).toEqual([MUSE]);
    expect(all[1]).toEqual(old[1]);
    expect(all[2]!.gen?.model).toBe(MUSE);
  });

  it('redoes a failed first try once on GPT Image 2.5 and keeps why it failed', async () => {
    results.set(MUSE, () => ({ status: 'failed', url: null, error: 'did not pass content safety review' }));
    const all = await makeNew();
    expect(submitted).toEqual([MUSE, GPT]);
    expect(all[2]!.gen?.model).toBe(GPT);
    expect(all[2]!.gen?.failed?.[0]).toContain('safety');
  });

  it('redoes a flawed Muse photo on GPT Image 2.5, not on Muse', async () => {
    flaws = ['3 hands on one person'];
    await makeNew();
    expect(submitted).toEqual([MUSE, GPT]);
  });

  it('stops at 2 images: a flawed redo is kept', async () => {
    results.set(MUSE, () => ({ status: 'failed', url: null, error: 'timed out' }));
    flaws = ['3 hands on one person'];
    const all = await makeNew();
    expect(submitted).toEqual([MUSE, GPT]);
    expect(all[2]!.gen?.flawLeft).toBe('3 hands on one person');
  });

  const avatar = { prompt: 'with the avatar', refs: ['brand-cast/w/m-1.jpg'] };

  it('sends a Brand Cast avatar straight to GPT Image 2.5, never Muse', async () => {
    const all = await makeNew(avatar);
    expect(submitted).toEqual([GPT]);
    expect(all[2]!.gen?.model).toBe(GPT);
  });

  it('keeps one redo for an avatar photo that fails or is flawed', async () => {
    flaws = ['3 hands on one person'];
    await makeNew(avatar);
    expect(submitted).toEqual([GPT, GPT]);
    submitted.length = 0;
    results.set(GPT, () => ({ status: 'failed', url: null, error: 'down' }));
    const all = await makeNew(avatar);
    expect(submitted).toEqual([GPT, GPT]);
    expect(all[2]!.imageKey).toBeNull();
  });

  it('reports an error when GPT Image 2.5 fails too, with no third model', async () => {
    results.set(MUSE, () => ({ status: 'failed', url: null, error: 'timed out' }));
    results.set(GPT, () => ({ status: 'failed', url: null, error: 'down' }));
    const all = await makeNew();
    expect(submitted).toEqual([MUSE, GPT]);
    expect(all[2]!.imageKey).toBeNull();
    expect(all[2]!.error).toContain('reapi-gpt-2.5');
  });
});
