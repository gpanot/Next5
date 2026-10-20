import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  paid: vi.fn<(workspaceId: string | null) => Promise<boolean>>(),
  generate: vi.fn(),
  store: vi.fn(),
  results: vi.fn(),
  pexels: vi.fn(),
  downloadPexels: vi.fn(async (id: string) => Buffer.from(id)),
  chat: vi.fn(),
}));

vi.mock('../../../src/server/slideshowCredits/paid', () => ({ workspaceGetsAiImages: mocks.paid }));
vi.mock('../../../src/server/slideshow/core/generatedAssets', () => ({ generateShotImages: mocks.generate, storeShotAsset: mocks.store }));
vi.mock('../../../src/server/autoSlideshow/campaign/unsplash', () => ({ unsplashResults: mocks.results }));
vi.mock('../../../src/server/autoSlideshow/campaign/pexels', () => ({ searchPexels: mocks.pexels, downloadPexels: mocks.downloadPexels }));
vi.mock('../../../src/server/ai/openai', () => ({ chatJson: mocks.chat }));

import { batchShotImages, type BatchNeed } from '../../../src/server/slideshow/core/imageNeeds';
import { newStockUsed, stockQuery, stockShotImages } from '../../../src/server/slideshow/core/stockImages';

const need = (text: string, description?: string): BatchNeed['need'] =>
  ({ key: 'electricians:pain', role: 'pain', text, ...(description ? { photo: { prompt: 'p', description } } : {}) });

describe('stockQuery', () => {
  it('keeps the first telling words of the photo description', () => {
    expect(stockQuery(need('Calls go to voicemail.', 'A tired electrician sitting in his van at dusk, looking at a phone'))).toBe('tired electrician sitting van');
  });

  it('falls back to the line when the shot has no photo description', () => {
    expect(stockQuery(need('Missed calls cost you jobs'))).toBe('missed calls cost you');
  });
});

describe('batchShotImages', () => {
  beforeEach(() => {
    mocks.paid.mockReset();
    mocks.generate.mockReset().mockResolvedValue(new Map());
    mocks.results.mockReset().mockResolvedValue([]);
    mocks.pexels.mockReset().mockResolvedValue([]);
    mocks.chat.mockReset().mockResolvedValue(null);
  });

  const needs: BatchNeed[] = [{ script: 0, audience: 'electricians', categories: ['home_services'], need: need('Calls go to voicemail.') }];

  it('makes the free plan\'s cheap images for paid workspaces too while PAID_LIKE_FREE', async () => {
    mocks.paid.mockResolvedValue(true);
    await batchShotImages(needs, 1, 'ws1', {} as never);
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.generate.mock.calls[0]![5]).toBe('reapi-gpt-image-2-low');
  });

  it('makes cheap GPT Image 2 images, not stock, before the workspace has paid', async () => {
    mocks.paid.mockResolvedValue(false);
    const out = await batchShotImages(needs, 1, 'ws1', {} as never);
    expect(mocks.generate.mock.calls[0]![5]).toBe('reapi-gpt-image-2-low');
    expect(mocks.pexels).not.toHaveBeenCalled();
    expect(out).toHaveLength(1);
  });

  it('tells each script its images as soon as they are made, not at the end of the batch', async () => {
    mocks.paid.mockResolvedValue(false);
    let finish!: () => void;
    const later = new Promise<void>((resolve) => { finish = resolve; });
    mocks.generate.mockImplementation(async (_a: string, _c: string[], leads: Array<{ key: string; priority?: number }>, _w: unknown, _b: unknown, _m: unknown, onImage: (k: string, i: unknown) => void) => {
      const [first, second] = leads;
      onImage(first!.key, { r2Key: 'one' });
      await later;
      onImage(second!.key, null);
      return new Map([[first!.key, { r2Key: 'one' }]]);
    });
    const two: BatchNeed[] = [
      { script: 0, audience: 'electricians', categories: [], need: need('Calls go to voicemail.') },
      { script: 1, audience: 'electricians', categories: [], need: { ...need('A totally different moment here'), key: 'electricians:oldWay', role: 'oldWay' } },
    ];
    const told: number[] = [];
    const run = batchShotImages(two, 2, 'ws1', {} as never, (script) => told.push(script));
    await new Promise((r) => setTimeout(r, 0));
    expect(told).toEqual([0]);
    expect(mocks.generate.mock.calls[0]![2].map((l: { priority?: number }) => l.priority)).toEqual([0, 1]);
    finish();
    await run;
    expect(told).toEqual([0, 1]);
  });

  it('makes cheap images when the paid check fails', async () => {
    mocks.paid.mockRejectedValue(new Error('db down'));
    await batchShotImages(needs, 1, 'ws1', {} as never);
    expect(mocks.generate.mock.calls[0]![5]).toBe('reapi-gpt-image-2-low');
  });
});

const brand = { business: 'Sparky', sells: 'electrical repairs', look: null, productAsSubject: false };

describe('stockShotImages', () => {
  const result = (id: string) => ({ id, label: `photo ${id}`, download: vi.fn(async () => ({ bytes: Buffer.from(id) })) });
  const keys = (out: Map<string, unknown>) => [...out.values()].map((a) => (a as { r2Key: string }).r2Key).sort();

  beforeEach(() => {
    mocks.store.mockReset().mockImplementation(async (file: { description: string; model: string }) => ({ r2Key: file.description, model: file.model }));
    mocks.chat.mockReset().mockResolvedValue({ s0: 'electrician on phone in van', s1: 'Electrician  Fixing Panel!' });
    mocks.pexels.mockReset().mockResolvedValue([]);
    mocks.results.mockReset().mockResolvedValue([]);
  });

  it('searches the scene the model wrote, Pexels first', async () => {
    mocks.pexels.mockResolvedValue([{ id: '1', label: 'pexels 1' }, { id: '2', label: 'pexels 2' }]);
    const shots = [need('Calls go to voicemail.'), { ...need('Late replies'), key: 'electricians:oldWay' }];
    const out = await stockShotImages('electricians', [], shots, 'ws1', brand);
    expect(mocks.pexels.mock.calls.map((c) => c[0]).sort()).toEqual(['electrician fixing panel', 'electrician on phone in van']);
    expect(keys(out)).toEqual(['pexels 1', 'pexels 2']);
    expect(mocks.results).not.toHaveBeenCalled();
    expect(mocks.store.mock.calls[0]![0]).toMatchObject({ model: 'pexels', source: 'scraped', stock: { business: 'Sparky' } });
  });

  it('falls back to Unsplash when Pexels fails, and to the line when the model writes nothing', async () => {
    mocks.chat.mockResolvedValue(null);
    mocks.pexels.mockRejectedValue(new Error('HTTP 429'));
    mocks.results.mockResolvedValue([result('a'), result('b')]);
    const shots = [need('Calls go to voicemail.'), { ...need('Calls go to voicemail.'), key: 'electricians:oldWay' }];
    const out = await stockShotImages('electricians', [], shots, 'ws1', brand, newStockUsed());
    expect(mocks.results).toHaveBeenCalledWith('calls voicemail');
    expect(keys(out)).toEqual(['photo a', 'photo b']);
    expect(mocks.store.mock.calls[0]![0]).toMatchObject({ model: 'unsplash' });
  });

  it('leaves a shot to the library when no site has a photo', async () => {
    mocks.results.mockRejectedValueOnce(new Error('unsplash_limit'));
    const shots = [need('Calls go to voicemail.'), { ...need('Late replies'), key: 'electricians:oldWay' }];
    expect((await stockShotImages('electricians', [], shots, 'ws1', brand)).size).toBe(0);
  });
});
