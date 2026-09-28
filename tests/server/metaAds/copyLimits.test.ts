import { describe, expect, it } from 'vitest';
import { trimToLimit } from '../../../src/server/metaAds/copyLimits';

describe('trimToLimit', () => {
  it('keeps whole sentences that fit', () => {
    const text = 'Source bulk vintage with buyer protection on every order. Shipping is included in the price you see. Customs & duties are handled for most countries.';
    const out = trimToLimit(text, 125);
    expect(out).toBe('Source bulk vintage with buyer protection on every order. Shipping is included in the price you see.');
    expect(out.length).toBeLessThanOrEqual(125);
  });

  it('falls back to the last whole word when no sentence fits', () => {
    const out = trimToLimit('Bundles from verified suppliers, shipped to your door, every single week', 32);
    expect(out).toBe('Bundles from verified suppliers');
  });
});
