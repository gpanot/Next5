import { describe, expect, it } from 'vitest';
import { factsLine, isLowRes, isWeakTag, parseZillowUrl, statusLabel, tagLabel, themeIdForStatus } from '../../src/lib/listingPhotos';

describe('parseZillowUrl', () => {
  it('reads the zpid from a home link and drops tracking', () => {
    expect(parseZillowUrl('https://www.zillow.com/homedetails/2720-Carolyn-Dr-SE-Smyrna-GA-30080/14312548_zpid/?utm_source=share')).toEqual({
      zpid: '14312548',
      url: 'https://www.zillow.com/homedetails/2720-Carolyn-Dr-SE-Smyrna-GA-30080/14312548_zpid/',
    });
    expect(parseZillowUrl('  zillow.com/homedetails/x/89551754_zpid  ')?.zpid).toBe('89551754');
    expect(parseZillowUrl('https://m.zillow.com/homedetails/x/7579008_zpid/')?.url).toBe('https://www.zillow.com/homedetails/x/7579008_zpid/');
  });

  it('rejects search pages, building pages and other sites', () => {
    expect(parseZillowUrl('https://www.zillow.com/austin-tx/')).toBeNull();
    expect(parseZillowUrl('https://www.zillow.com/b/160-beach-117-st-rockaway-park-ny-9VzB5T/')).toBeNull();
    expect(parseZillowUrl('https://www.redfin.com/GA/Smyrna/home/14312548_zpid/')).toBeNull();
    expect(parseZillowUrl('https://notzillow.com/homedetails/x/14312548_zpid/')).toBeNull();
    expect(parseZillowUrl('')).toBeNull();
  });
});

describe('photo tags', () => {
  it('labels tags and flags the photos that rarely work with a person', () => {
    expect(tagLabel('yard')).toBe('Backyard');
    expect(tagLabel('garage')).toBeNull();
    expect(isWeakTag('aerial')).toBe(true);
    expect(isWeakTag('kitchen')).toBe(false);
    expect(isWeakTag(null)).toBe(false);
  });
});

describe('listing copy', () => {
  it('labels status, picks a theme and writes the facts line', () => {
    expect(statusLabel('pending')).toBe('Under contract');
    expect(statusLabel('nope')).toBeNull();
    expect(themeIdForStatus('open_house')).toBe('open-house');
    expect(themeIdForStatus('sold')).toBe('just-listed');
    expect(factsLine({ priceCents: 39_900_000, beds: 3, baths: 2, sqft: 1350 })).toBe('$399,000 · 3 bd · 2 ba · 1,350 sqft');
    expect(isLowRes(800)).toBe(true);
    expect(isLowRes(1536)).toBe(false);
    expect(isLowRes(null)).toBe(false);
  });
});
