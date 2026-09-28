import { describe, expect, it } from 'vitest';
import { restoreUpTo, unsupportedNumbers } from '../../../src/server/metaAds/claims';

const FACTS = 'Get up to 50% off across hundreds of vendors! 45,000+ buyers source on Fleek. 1m+ bundles available. $3 each.';

describe('restoreUpTo', () => {
  it('puts back an "up to" the facts have', () => {
    expect(restoreUpTo('50% off + shipping', FACTS)).toBe('Up to 50% off + shipping');
    expect(restoreUpTo('Save 50% on bundles', FACTS)).toBe('Save up to 50% on bundles');
  });

  it('leaves copy alone when it already says "up to" or the fact has no qualifier', () => {
    expect(restoreUpTo('Save up to 50% today', FACTS)).toBe('Save up to 50% today');
    expect(restoreUpTo('Join 45,000+ buyers', FACTS)).toBe('Join 45,000+ buyers');
  });
});

describe('unsupportedNumbers', () => {
  it('flags numbers the facts never state', () => {
    expect(unsupportedNumbers('Join 45,000+ buyers. 1m+ bundles.', FACTS)).toEqual([]);
    expect(unsupportedNumbers('Save 70% — trusted by 100,000 resellers', FACTS)).toEqual(['70%', '100,000']);
  });
});
