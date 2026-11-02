/** Rewriting a carousel bank for a new audience: old slideshows keep resolving, new picks use only the new parts. No DB. */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

import { withRefreshedParts } from '../../../src/server/autoSlideshow/bank/build';
import { assembleCombo, emptyUsage, pickCombos, swapCombo } from '../../../src/server/autoSlideshow/bank/pick';
import { fixCounters } from '../../../src/server/studio/siteCrawl';
import { liveBank, type SlideshowBankContent } from '../../../src/types/admin/slideshowBank';

const bank = (word: string): SlideshowBankContent => ({
  meats: [{ id: 'm1', goal: 'sales', topic: word, promise: '', listicle: false, items: [], caption: word, hashtags: [] }] as unknown as SlideshowBankContent['meats'],
  hooks: [{ id: 'm1h1', meatId: 'm1', patternId: 'p', category: 'c', text: word, photo: '', score: 1 }],
  ctas: [{ id: 'c1', angle: 'a', title: word, body: '', photo: '' }],
});
const merged = withRefreshedParts(bank('old'), bank('new'), 'r1-');

describe('withRefreshedParts', () => {
  it('gives new parts their own ids and links their hooks to them', () => {
    expect(liveBank(merged).hooks).toEqual([expect.objectContaining({ id: 'r1-m1h1', meatId: 'r1-m1', text: 'new' })]);
  });
  it('keeps an old slideshow readable', () => {
    expect(assembleCombo(merged, { meatId: 'm1', hookId: 'm1h1', ctaId: 'c1' }).hook.text).toBe('old');
  });
  it('picks only new parts for new slideshows', () => {
    const [combo] = pickCombos(merged, emptyUsage(), ['sales' as never]);
    expect(combo).toEqual({ meatId: 'r1-m1', hookId: 'r1-m1h1', ctaId: 'r1-c1' });
  });
  it('puts a new call to action first', () => {
    expect(merged.ctas[0]!.title).toBe('new');
  });
  it('a rewrite of an old slideshow keeps its hooks but takes a live call to action', () => {
    expect(swapCombo(merged, emptyUsage(), { meatId: 'm1', hookId: 'm1h1', ctaId: 'c1' }).ctaId).toBe('r1-c1');
  });
});

describe('fixCounters', () => {
  it('fills the real number, drops one it cannot find, leaves other lines', () => {
    const counters = new Map([['google reviews', '100+ Google Reviews']]);
    expect(fixCounters('Hi\n0+ Google Reviews\n0+ Clients Served\n0% fees', counters)).toBe('Hi\n100+ Google Reviews\n0% fees');
  });
});
