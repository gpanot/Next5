import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ treg: vi.fn() }));
vi.mock('../../../src/server/shorts/treg', () => ({ tregJson: mocks.treg, withRetry: (fn: () => Promise<unknown>) => fn() }));

const LITE_PAGE = { images: { 'Image 1: Free Woman checking a pantry shelf Stock Photo': 'https://images.pexels.com/photos/11/pexels-photo-11.jpeg' } };
const LINKUP_PAGE = { images: [{ alt: 'Free Man texting in a store Stock Photo', url: 'https://images.pexels.com/photos/22/pexels-photo-22.jpeg' }, { alt: 'onion', url: 'https://images.pexels.com/photos/33/x.jpeg' }] };

/** A fresh module each test: its Litescrape pause and search cache start empty. */
const load = async () => {
  vi.resetModules();
  return import('../../../src/server/autoSlideshow/campaign/pexels');
};

describe('searchPexels', () => {
  beforeEach(() => mocks.treg.mockReset());

  it('uses Litescrape when it answers', async () => {
    mocks.treg.mockResolvedValue({ data: LITE_PAGE, costMicros: 150 });
    const { searchPexels } = await load();
    expect(await searchPexels('woman pantry')).toEqual([{ id: '11', label: 'Woman checking a pantry shelf' }]);
    expect(mocks.treg).toHaveBeenCalledOnce();
    expect(mocks.treg.mock.calls[0]![0]).toBe('litescrape.web.fetch.post');
  });

  it('falls back to Linkup when Litescrape fails, then skips Litescrape for a while', async () => {
    mocks.treg.mockImplementation(async (endpoint?: string) => {
      if (endpoint?.startsWith('litescrape')) throw new Error('treg litescrape.web.fetch.post: HTTP 402 insufficient_credits');
      return { data: LINKUP_PAGE, costMicros: 5000 };
    });
    const { searchPexels } = await load();
    expect(await searchPexels('man texting')).toEqual([{ id: '22', label: 'Man texting in a store' }]);
    await searchPexels('another search');
    expect(mocks.treg.mock.calls.map((c) => c[0])).toEqual(['litescrape.web.fetch.post', 'linkup.web.fetch', 'linkup.web.fetch']);
  });

  it('falls back to Linkup when the Litescrape page has no results', async () => {
    mocks.treg.mockImplementation(async (endpoint?: string) => ({ data: endpoint?.startsWith('litescrape') ? { images: {} } : LINKUP_PAGE, costMicros: 0 }));
    const { searchPexels } = await load();
    expect(await searchPexels('man texting')).toHaveLength(1);
    expect(mocks.treg).toHaveBeenCalledTimes(2);
  });
});
