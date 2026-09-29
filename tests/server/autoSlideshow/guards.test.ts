import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/server/metaAds/llm', () => ({ metaAdsJson: vi.fn() }));
vi.mock('../../../src/server/storage/objectStore', () => ({ getObject: vi.fn() }));

const lever = { id: 'L1', criterion: 'proof' as const, claim: 'Golfers save 4-6 strokes per round', quote: 'save 4-6 strokes per round on average' };

describe('ctaBodyIsProven', () => {
  it('keeps a CTA whose numbers come from a proven claim or the site', async () => {
    const { ctaBodyIsProven } = await import('../../../src/server/autoSlideshow/write');
    expect(ctaBodyIsProven('Golfers save 4-6 strokes per round.', [lever], '')).toBe(true);
    expect(ctaBodyIsProven('Trusted by over 20,000 golfers.', [], 'Trusted by over 20,000 golfers worldwide')).toBe(true);
    expect(ctaBodyIsProven('Your AI golf coach in your pocket.', [], '')).toBe(true);
  });

  it('drops a CTA with a number the site never says', async () => {
    const { ctaBodyIsProven } = await import('../../../src/server/autoSlideshow/write');
    expect(ctaBodyIsProven('Trusted by 50,000 golfers.', [lever], 'Trusted by over 20,000 golfers')).toBe(false);
  });

  it('never proves a range from stray single digits on the page', async () => {
    const { ctaBodyIsProven } = await import('../../../src/server/autoSlideshow/write');
    const site = 'Results in typically 4-6 weeks. 4.9/5 from 1,200+ golfers. Step 2 of 5.';
    expect(ctaBodyIsProven('Golfers save 2–5 strokes per round.', [], site)).toBe(false);
    expect(ctaBodyIsProven('See results in 4–6 weeks.', [], site)).toBe(true);
    expect(ctaBodyIsProven('Rated 4.9/5 by 1,200+ golfers.', [], site)).toBe(true);
    expect(ctaBodyIsProven('Join 200 golfers.', [], site)).toBe(false);
  });
});

describe('ctaFitsBusiness', () => {
  it('allows "download" only when the site talks about an app', async () => {
    const { ctaFitsBusiness } = await import('../../../src/server/autoSlideshow/write');
    expect(ctaFitsBusiness('Download "Scratch AI" from the App Store', 'Get the Scratch AI app')).toBe(true);
    expect(ctaFitsBusiness('Download "Me And My Golf" from the App Store', 'Online coaching plans for golfers')).toBe(false);
    expect(ctaFitsBusiness('Start your free week at Me And My Golf', 'Online coaching plans')).toBe(true);
  });
});

describe('hookMatchesCount', () => {
  it('needs the hook number to equal the meat slide count', async () => {
    const { hookMatchesCount } = await import('../../../src/server/autoSlideshow/write');
    expect(hookMatchesCount('7 Golf Cheat Codes', 7)).toBe(true);
    expect(hookMatchesCount('5 Golf Cheat Codes', 7)).toBe(false);
    expect(hookMatchesCount('Golf Secrets Nobody Tells You', 7)).toBe(true);
  });
});

describe('photoIndexes', () => {
  it('gives every slide of a slideshow a different photo and starts each slideshow elsewhere', async () => {
    const { photoIndexes } = await import('../../../src/server/autoSlideshow/render');
    const available = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const first = photoIndexes(9, 0, available);
    const second = photoIndexes(9, 1, available);
    expect(new Set(first).size).toBe(9);
    expect(first[0]).not.toBe(second[0]);
  });

  it('skips photos that failed', async () => {
    const { photoIndexes } = await import('../../../src/server/autoSlideshow/render');
    expect(photoIndexes(3, 0, [1, 4, 6])).toEqual([1, 4, 6]);
  });
});
