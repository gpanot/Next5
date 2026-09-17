import { afterEach, describe, expect, it, vi } from 'vitest';
import rows from '../../fixtures/zillow/detail-rows.json';
import { tagPhotos } from '../../../src/server/listings/photoTags';
import { labelFromUrl, normalizeZillowRow, thumbFor } from '../../../src/server/listings/zillowNormalize';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const byZpid = (zpid: number) => normalizeZillowRow(rows.find((r) => r.zpid === zpid))!;

describe('normalizeZillowRow (spike listings)', () => {
  it('reads facts and the gallery of a home for sale', () => {
    const home = byZpid(14312548);
    expect(home).toMatchObject({
      zpid: '14312548', priceCents: 39_900_000, beds: 3, baths: 2, sqft: 1350, status: 'just_listed', daysOnMarket: 6,
      address: { street: '2720 Carolyn Dr SE', city: 'Smyrna', state: 'GA', zip: '30080', full: '2720 Carolyn Dr SE, Smyrna, GA 30080' },
    });
    expect(home.candidates).toHaveLength(20);
    expect(home.candidates[0]).toMatchObject({
      id: 'dcf4a8c7ede14a15c3b4179502975233',
      thumbUrl: 'https://photos.zillowstatic.com/fp/dcf4a8c7ede14a15c3b4179502975233-cc_ft_384.jpg',
      tag: null,
    });
  });

  it('maps every status we tested', () => {
    expect(byZpid(7579008).status).toBe('sold');
    expect(byZpid(452213175).status).toBe('coming_soon');
    expect(byZpid(20521927).status).toBe('for_sale');
    expect(byZpid(89551754).candidates).toHaveLength(30);
    expect(normalizeZillowRow({ ...rows[0], listingStatus: 'forSale', listingType: { isOpenHouse: true } })?.status).toBe('open_house');
    expect(normalizeZillowRow({ ...rows[0], listingStatus: 'other', listingType: {} })?.status).toBe('off_market');
  });

  it('skips photos from other hosts and duplicates, and survives an empty row', () => {
    const photos = [
      { url: 'https://photos.zillowstatic.com/fp/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-p_f.jpg' },
      { url: 'https://photos.zillowstatic.com/fp/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-uncropped_scaled_within_1536_1152.jpg' },
      { url: 'https://evil.example/fp/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-p_f.jpg' },
    ];
    expect(normalizeZillowRow({ zpid: 1, listingPhotos: photos })?.candidates).toHaveLength(1);
    expect(normalizeZillowRow(undefined)).toBeNull();
    expect(normalizeZillowRow({})).toBeNull();
  });

  it('names a home from its link until the import lands', () => {
    expect(labelFromUrl('https://www.zillow.com/homedetails/2720-Carolyn-Dr-SE-Smyrna-GA-30080/14312548_zpid/')).toBe('2720 Carolyn Dr SE Smyrna GA 30080');
    expect(thumbFor('https://photos.zillowstatic.com/fp/abc-p_f.jpg')).toBe('https://photos.zillowstatic.com/fp/abc-cc_ft_384.jpg');
  });
});

describe('tagPhotos', () => {
  it('keeps valid labels in order and drops junk', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test');
    vi.stubEnv('NEXT5_MOCK_GENERATION', 'false');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ tags: ['Kitchen', 'garage', 'aerial'] }) } }] })));
    expect(await tagPhotos(['a', 'b', 'c', 'd'])).toEqual(['kitchen', null, 'aerial', null]);
  });

  it('returns no tags without OpenAI', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(await tagPhotos(['a', 'b'])).toEqual([null, null]);
  });
});
