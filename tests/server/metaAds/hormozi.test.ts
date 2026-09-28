import { describe, expect, it } from 'vitest';
import { HORMOZI_CRITERIA, type AdRating, type CompetitorAd, type CriterionScore, type HormoziCriterion } from '../../../src/types/admin/metaAds';
import { isVerbatim } from '../../../src/server/metaAds/hormozi/verify';
import { mergeGrades } from '../../../src/server/metaAds/hormozi/rubric';
import { choosePicks, craftScore, spearman } from '../../../src/server/metaAds/hormozi/scoring';

const ad = (id: string, pageName: string, own = false): CompetitorAd => ({
  id, pageId: pageName, pageName, isActive: true, startDate: '2026-06-01T00:00:00.000Z', body: 'Vintage by the pound. $3 each.', title: '', cta: 'Shop now',
  format: 'IMAGE', imageUrl: null, daysRunning: 60, variants: 1, libraryUrl: '', keyword: '', own,
});

const zero = () => Object.fromEntries(HORMOZI_CRITERIA.map((c) => [c, { score: 0, quote: null }])) as Record<HormoziCriterion, CriterionScore>;

const rating = (adId: string, winnerScore: number, proven: boolean, craft = 50, own = false): AdRating => ({
  adId, own, scores: zero(), unstable: [], rejectedQuotes: 0, copyScore: craft, creative: null, craftScore: craft, winnerScore, proven,
});

describe('isVerbatim', () => {
  it('accepts a quote that is in the text, ignoring case, curly quotes and emoji', () => {
    expect(isVerbatim('Trusted by 30,000+ US resellers', 'Thrift Vintage Fashion is trusted by 30,000+ US resellers 🔥')).toBe(true);
    expect(isVerbatim('we’re shipping', "We're shipping out a customer's order")).toBe(true);
  });

  it('rejects paraphrases, invented words and tiny quotes', () => {
    expect(isVerbatim('Trusted by 30,000 happy resellers', 'trusted by 30,000+ US resellers')).toBe(false);
    expect(isVerbatim('ok', 'ok then')).toBe(false);
    expect(isVerbatim(null, 'anything')).toBe(false);
  });
});

describe('mergeGrades', () => {
  it('averages close gradings down and flags far-apart ones at the lower score', () => {
    const a = { ...zero(), offer: { score: 3, quote: '$3 each' }, proof: { score: 3, quote: '30,000+' } };
    const b = { ...zero(), offer: { score: 2, quote: '$3 each' }, proof: { score: 0, quote: null } };
    const { scores, unstable } = mergeGrades(a, b);
    expect(scores.offer).toEqual({ score: 2, quote: '$3 each' });
    expect(scores.proof.score).toBe(0);
    expect(unstable).toEqual(['proof']);
  });
});

describe('craftScore', () => {
  it('weighs copy 60 / image 40, and is the copy score when no image was read', () => {
    expect(craftScore(50, null)).toBe(50);
    expect(craftScore(50, { visualScore: 100 } as never)).toBe(70);
  });
});

describe('choosePicks', () => {
  const ads = [ad('1', 'Daniel'), ad('2', 'Daniel'), ad('3', 'Patch'), ad('4', 'Retro'), ad('9', 'Fleek', true)];

  it('picks proven winners first, one per advertiser, even over better craft', () => {
    const picks = choosePicks(ads, [rating('1', 80, true, 40), rating('2', 70, true), rating('3', 60, true, 30), rating('4', 50, false, 95)]);
    expect(picks.map((p) => p.ad.id)).toEqual(['1', '3']);
  });

  it('falls back to the best available, flagged unproven, when nothing is proven', () => {
    const picks = choosePicks(ads, [rating('3', 40, false), rating('4', 45, false)]);
    expect(picks.map((p) => [p.ad.id, p.proven])).toEqual([['4', false], ['3', false]]);
  });

  it("adds the brand's own proven ad as an extra pick", () => {
    const picks = choosePicks(ads, [rating('1', 80, true), rating('9', 76, true, 50, true)]);
    expect(picks.map((p) => p.ad.id)).toEqual(['1', '9']);
  });
});

describe('spearman', () => {
  it('is 1 for the same order, -1 for reversed, null for too few points', () => {
    expect(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50])).toBe(1);
    expect(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBe(-1);
    expect(spearman([1, 2], [1, 2])).toBeNull();
  });
});
