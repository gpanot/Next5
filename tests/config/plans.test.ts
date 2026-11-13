import { describe, expect, it } from 'vitest';
import {
  getEffectiveMonthlyUsdCents,
  getPricePerVideoUsdCents,
  getTermPriceUsdCents,
  getTermSavingsUsdCents,
  isTermMonths,
  plansForProduct,
  TERMS,
} from '../../src/config/plans';
import { packForCategory, shotsForProduct } from '../../src/config/shots';
import { addMonths } from '../../src/lib/dates';

describe('term pricing', () => {
  it.each([
    ['brand_starter', 1, 2_900],
    ['brand_starter', 12, 31_200], // $26.10/mo rounds to $26 × 12
    ['brand_pro', 12, 106_800], // $89 × 12
    ['brand_agency', 1, 19_900],
    ['brand_agency', 12, 214_800], // $179 × 12
    ['shop_starter', 12, 52_800], // $44 × 12
    ['shop_pro', 12, 214_800], // $179 × 12
    ['shop_scale', 1, 39_900],
    ['shop_scale', 12, 430_800], // $359 × 12
  ] as const)('%s × %i months = %i cents', (planId, term, cents) => {
    expect(getTermPriceUsdCents(planId, term)).toBe(cents);
  });

  it('computes savings and effective monthly price', () => {
    expect(getTermSavingsUsdCents('brand_pro', 12)).toBe(12_000);
    expect(getEffectiveMonthlyUsdCents('brand_pro', 12)).toBe(8_900);
    expect(getTermSavingsUsdCents('brand_starter', 1)).toBe(0);
  });

  it('computes price per video', () => {
    expect(getPricePerVideoUsdCents('brand_starter')).toBe(97);
    expect(getPricePerVideoUsdCents('shop_starter')).toBe(98);
  });

  it('offers monthly or yearly only', () => {
    expect(TERMS).toEqual([1, 12]);
    expect(isTermMonths(3)).toBe(false);
    expect(isTermMonths(6)).toBe(false);
  });

  it('lists three plans per product', () => {
    expect(plansForProduct('brand').map((p) => p.id)).toEqual(['brand_starter', 'brand_pro', 'brand_agency']);
    expect(plansForProduct('shop').map((p) => p.id)).toEqual(['shop_starter', 'shop_pro', 'shop_scale']);
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
