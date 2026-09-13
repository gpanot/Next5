import { describe, expect, it } from 'vitest';
import {
  getEffectiveMonthlyUsdCents,
  getPricePerPhotoUsdCents,
  getTermPriceUsdCents,
  getTermSavingsUsdCents,
  plansForProduct,
} from '../../src/config/plans';
import { packForCategory, shotsForProduct } from '../../src/config/shots';
import { addMonths } from '../../src/lib/dates';

describe('term pricing', () => {
  it.each([
    ['brand_starter', 1, 1_900],
    ['brand_starter', 3, 5_100],
    ['brand_starter', 6, 9_100],
    ['brand_pro', 3, 13_200],
    ['brand_pro', 6, 23_500],
    ['shop_starter', 3, 4_100], // $40.50 rounds up
    ['shop_pro', 6, 18_700],
  ] as const)('%s × %i months = %i cents', (planId, term, cents) => {
    expect(getTermPriceUsdCents(planId, term)).toBe(cents);
  });

  it('computes savings and effective monthly price', () => {
    expect(getTermSavingsUsdCents('brand_pro', 3)).toBe(1_500);
    expect(getEffectiveMonthlyUsdCents('brand_pro', 3)).toBe(4_400);
    expect(getTermSavingsUsdCents('brand_starter', 1)).toBe(0);
  });

  it('computes price per photo', () => {
    expect(getPricePerPhotoUsdCents('brand_starter')).toBe(63);
    expect(getPricePerPhotoUsdCents('shop_starter')).toBe(30);
  });

  it('lists two plans per product', () => {
    expect(plansForProduct('brand').map((p) => p.id)).toEqual(['brand_starter', 'brand_pro']);
    expect(plansForProduct('shop').map((p) => p.id)).toEqual(['shop_starter', 'shop_pro']);
  });
});

describe('shop packs', () => {
  it('forces the accessory pack for accessories', () => {
    expect(packForCategory('bag', 'full')).toBe('accessory');
    expect(packForCategory('dress', 'accessory')).toBe('listing');
  });

  it('skips the back shot without a back photo', () => {
    expect(shotsForProduct('dress', 'full', false)).not.toContain('back_or_side');
    expect(shotsForProduct('dress', 'full', true)).toContain('back_or_side');
  });
});

describe('addMonths', () => {
  it('clamps to month end and preserves time', () => {
    expect(addMonths(new Date('2026-01-31T10:30:00Z'), 1).toISOString()).toBe('2026-02-28T10:30:00.000Z');
    expect(addMonths(new Date('2026-09-14T00:00:00Z'), 3).toISOString()).toBe('2026-12-14T00:00:00.000Z');
    expect(addMonths(new Date('2026-11-30T00:00:00Z'), 3).toISOString()).toBe('2027-02-28T00:00:00.000Z');
  });
});
