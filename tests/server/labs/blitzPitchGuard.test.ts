import { describe, expect, it } from 'vitest';
import { pitchGuard } from '../../../src/server/labs/blitzPitchGuard';

const guard = pitchGuard('KitchenPal');

describe('pitchGuard', () => {
  it('flags the business, the app, ratings and endorsements', () => {
    expect(guard('KitchenPal spots those items fast')).toMatch(/business/);
    expect(guard('Kitchen Pal plans dinner')).toMatch(/business/);
    expect(guard('The app plans dinner for you')).toMatch(/pitches/);
    expect(guard('Rated 4.5 stars from 7,000+ reviews')).toMatch(/pitches/);
    expect(guard('Recommended by PRI, Healthline, Food Navigator')).toMatch(/pitches/);
  });

  it('lets pure value through', () => {
    expect(guard('Put the soonest-to-go food where your eyes land first')).toBeNull();
    expect(guard('Plan tomorrow from what is already in your fridge')).toBeNull();
  });
});
