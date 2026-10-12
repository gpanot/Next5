import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  paid: vi.fn<(workspaceId: string | null) => Promise<boolean>>(),
  generate: vi.fn(),
  treg: vi.fn(),
}));

vi.mock('../../../src/server/slideshowCredits/paid', () => ({ workspaceHasPaid: mocks.paid }));
vi.mock('../../../src/server/slideshow/core/generatedAssets', () => ({ generateShotImages: mocks.generate, storeShotAsset: vi.fn() }));
vi.mock('../../../src/server/shorts/treg', () => ({ tregJson: mocks.treg, withRetry: <T>(fn: () => Promise<T>) => fn() }));

import { searchPexels } from '../../../src/server/autoSlideshow/campaign/pexels';
import { batchShotImages, type BatchNeed } from '../../../src/server/slideshow/core/imageNeeds';
import { stockQuery } from '../../../src/server/slideshow/core/stockImages';

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
    mocks.treg.mockReset().mockResolvedValue({ data: { images: {} }, costMicros: 0 });
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

describe('searchPexels', () => {
  it('reads the search results from the scraped images list, skipping ads and duplicates', async () => {
    mocks.treg.mockResolvedValue({
      costMicros: 150,
      data: {
        images: {
          'Image 3: electrician working': 'https://images.pexels.com/photos/33694016/pexels-photo-33694016.jpeg?h=40&w=40',
          'Image 18: Free Electrician fixing a panel indoors. Stock Photo': 'https://images.pexels.com/photos/33694016/pexels-photo-33694016/free-photo.jpeg?w=500',
          'Image 19: Create your own electrician content with Canva': 'https://content.pexels.com/aigc-bundle/images/x.jpg',
          'Image 26': 'https://media.istockphoto.com/id/1/photo.jpg',
          'Image 32: Free Crop faceless man using screwdriver Stock Photo': 'https://images.pexels.com/photos/5691589/pexels-photo-5691589.jpeg?w=500',
          'Image 33: Free Electrician fixing a panel indoors. Stock Photo': 'https://images.pexels.com/photos/33694016/pexels-photo-33694016.jpeg?w=500',
        },
      },
    });
    expect(await searchPexels('electrician panel test')).toEqual([
      { id: '33694016', label: 'Electrician fixing a panel indoors.' },
      { id: '5691589', label: 'Crop faceless man using screwdriver' },
    ]);
  });
});
