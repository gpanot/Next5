import { describe, expect, it } from 'vitest';
import { formatUsd, formatVnd, usdCentsToVnd } from '../../src/lib/money';

const RATE = 26_000; // VND per USD

describe('usdCentsToVnd — rounds up to nearest 1 000₫', () => {
  it('$19 → 494 000', () => {
    expect(usdCentsToVnd(1_900, RATE)).toBe(494_000);
  });

  it('$0.63 → 17 000 (16 380 rounds up)', () => {
    expect(usdCentsToVnd(63, RATE)).toBe(17_000);
  });

  it('$132 → 3 432 000 (exact)', () => {
    expect(usdCentsToVnd(13_200, RATE)).toBe(3_432_000);
  });

  it('rounds up when not on a 1 000 boundary', () => {
    // $1 × 26 000 = 26 000 exactly — no rounding needed
    expect(usdCentsToVnd(100, RATE)).toBe(26_000);
    // $0.01 × 26 000 = 260 → rounds up to 1 000
    expect(usdCentsToVnd(1, RATE)).toBe(1_000);
  });
});

describe('formatUsd', () => {
  it('hides cents when amount is whole dollars', () => {
    expect(formatUsd(1_900)).toBe('$19');
  });

  it('shows cents when amount has fractional dollars', () => {
    expect(formatUsd(63)).toBe('$0.63');
  });

  it('forces cents when showCents: true', () => {
    expect(formatUsd(1_900, { showCents: true })).toBe('$19.00');
  });
});

describe('formatVnd', () => {
  it('appends ₫ symbol', () => {
    expect(formatVnd(494_000)).toBe('494,000₫');
  });

  it('formats large numbers with commas', () => {
    expect(formatVnd(3_432_000)).toBe('3,432,000₫');
  });
});
