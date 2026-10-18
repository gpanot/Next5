import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  paid: vi.fn<(workspaceId: string | null) => Promise<boolean>>(),
  generate: vi.fn(),
  store: vi.fn(),
  results: vi.fn(),
}));

vi.mock('../../../src/server/slideshowCredits/paid', () => ({ workspaceGetsAiImages: mocks.paid }));
vi.mock('../../../src/server/slideshow/core/generatedAssets', () => ({ generateShotImages: mocks.generate, storeShotAsset: mocks.store }));
vi.mock('../../../src/server/autoSlideshow/campaign/unsplash', () => ({ unsplashResults: mocks.results }));

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
  });

  const needs: BatchNeed[] = [{ script: 0, audience: 'electricians', categories: ['home_services'], need: need('Calls go to voicemail.') }];

  it('makes AI images once the workspace has paid', async () => {
    mocks.paid.mockResolvedValue(true);
    await batchShotImages(needs, 1, 'ws1', {} as never);
    expect(mocks.generate).toHaveBeenCalledOnce();
  });

  it('never makes AI images before the workspace has paid', async () => {
    mocks.paid.mockResolvedValue(false);
    const out = await batchShotImages(needs, 1, 'ws1', {} as never);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(out).toHaveLength(1);
  });

  it('uses stock when the paid check fails', async () => {
    mocks.paid.mockRejectedValue(new Error('db down'));
    await batchShotImages(needs, 1, 'ws1', {} as never);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});

describe('stockShotImages (Unsplash)', () => {
  const result = (id: string) => ({ id, label: `photo ${id}`, download: vi.fn(async () => ({ bytes: Buffer.from(id) })) });

  beforeEach(() => {
    mocks.store.mockReset().mockImplementation(async (file: { description: string; model: string }) => ({ r2Key: file.description, model: file.model }));
  });

  it('gives each shot its own photo, even when two shots search the same words', async () => {
    mocks.results.mockReset().mockResolvedValue([result('a'), result('b')]);
    const shots = [need('Calls go to voicemail.'), { ...need('Calls go to voicemail.'), key: 'electricians:oldWay' }];
    const out = await stockShotImages('electricians', [], shots, 'ws1', newStockUsed());
    expect([...out.values()].map((a) => (a as unknown as { r2Key: string }).r2Key).sort()).toEqual(['photo a', 'photo b']);
    expect(mocks.store.mock.calls[0]![0]).toMatchObject({ model: 'unsplash', source: 'scraped' });
  });

  it('leaves a shot to the library when Unsplash has nothing or fails', async () => {
    mocks.results.mockReset().mockRejectedValueOnce(new Error('unsplash_limit')).mockResolvedValueOnce([]);
    const shots = [need('Calls go to voicemail.'), { ...need('Late replies'), key: 'electricians:oldWay' }];
    expect((await stockShotImages('electricians', [], shots, 'ws1')).size).toBe(0);
  });
});
