import { describe, expect, it } from 'vitest';
import { fairHousingHits, isFairHousingClean } from '../../src/server/compliance/fairHousing';

describe('fairHousingHits', () => {
  it.each([
    'Perfect for families who love to cook',
    'Great for young couples starting out',
    'A safe neighborhood with quiet streets',
    'Walking distance to church and shops',
    'Top-rated schools nearby',
    'Huge master suite upstairs',
    'An exclusive community at the end of the road',
    'Family-friendly cul-de-sac',
    'Adults only building',
    'Low-crime area close to downtown',
    'Ideal for empty nesters',
    'Close to the synagogue',
    'Family-friendly cul-de-sac',
  ])('flags "%s"', (text) => {
    expect(fairHousingHits(text).length).toBeGreaterThan(0);
  });

  it.each([
    '3 bedrooms, 2 baths, fenced yard',
    'Primary suite with a walk-in closet',
    '0.4 miles to Main Street park',
    'Kitchen with quartz counters and a gas range',
    'Comment TOUR and I will send you the details',
  ])('passes "%s"', (text) => {
    expect(fairHousingHits(text)).toEqual([]);
  });

  it('checks a whole slideshow', () => {
    expect(isFairHousingClean(['Just listed in Austin', 'Open kitchen'])).toBe(true);
    expect(isFairHousingClean(['Just listed', 'Ideal for retirees'])).toBe(false);
  });
});
