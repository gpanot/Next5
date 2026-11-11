/** Client types: list checks, the hand edit on the profile, surviving a new extraction, and which ones Blitz writes for. */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

import { suggestedIndustries, usedIndustries } from '../../../src/lib/customerIndustries';
import { audienceFromList, parseIndustries, withAudience, withIndustries } from '../../../src/server/studio/customerIndustries';
import { keepEdits } from '../../../src/server/studio/siteProfile';
import type { FieldEnvelope, StudioProfileData } from '../../../src/server/studio/types';

const extracted: FieldEnvelope<string[]> = {
  value: ['commercial', 'strata', 'aged care'],
  evidence: ['for commercial properties', 'for strata managers', 'for aged care facilities'],
  source: 'inferred', confidence: 0.8, locked: false,
};
const profile = (field: FieldEnvelope<string[]>) => ({ market: { targetCustomerIndustries: field } }) as unknown as StudioProfileData;

describe('parseIndustries', () => {
  it('trims, drops blanks and case repeats', () => {
    expect(parseIndustries([' Aged  care ', '', 'aged care', 'Retail'])).toEqual(['Aged care', 'Retail']);
  });
  it('refuses more than 5 instead of dropping one', () => {
    expect(() => parseIndustries(['a', 'b', 'c', 'd', 'e', 'f'])).toThrow(/5 client types/);
  });
  it('refuses a non-list and a too long name', () => {
    expect(() => parseIndustries('retail')).toThrow();
    expect(() => parseIndustries(['x'.repeat(61)])).toThrow();
  });
});

describe('withIndustries', () => {
  it('marks the list as a hand edit, keeps quotes of kept items, leaves new ones without', () => {
    const field = withIndustries(profile(extracted), ['Strata', 'real estate']).market.targetCustomerIndustries;
    expect(field).toMatchObject({ value: ['Strata', 'real estate'], evidence: ['for strata managers', ''], source: 'manual', locked: true, confidence: 1 });
  });
  it('survives a new extraction', () => {
    const edited = withIndustries(profile(extracted), ['real estate']);
    expect(keepEdits(profile(extracted), edited).market.targetCustomerIndustries.value).toEqual(['real estate']);
  });
});

describe('usedIndustries', () => {
  const five = ['a', 'b', 'c', 'd', 'e'];
  it('uses the first 3 from the website', () => {
    expect(usedIndustries({ value: five, source: 'inferred' })).toEqual(['a', 'b', 'c']);
  });
  it('uses all 5 a person set', () => {
    expect(usedIndustries({ value: five, source: 'manual' })).toEqual(five);
  });
  it('handles a missing field', () => {
    expect(usedIndustries(undefined)).toEqual([]);
  });
});

describe('suggestions', () => {
  it('offers what the website gave beyond the first 3', () => {
    expect(suggestedIndustries({ value: ['a', 'b', 'c', 'd', 'e'], source: 'inferred' })).toEqual(['d', 'e']);
  });
  it('keeps offering what the owner left out', () => {
    const field = withIndustries(profile({ ...extracted, value: ['a', 'b', 'c', 'd'] }), ['a', 'z']).market.targetCustomerIndustries;
    expect(field.alternatives).toEqual(['b', 'c', 'd']);
    expect(suggestedIndustries(field)).toEqual(['b', 'c', 'd']);
  });
});

describe('withAudience', () => {
  const data = { market: { audienceDescription: { value: 'old', source: 'inferred', confidence: 0.8, locked: false } }, brand: { audience: { value: 'old', source: 'inferred', confidence: 0.8, locked: false } } } as unknown as StudioProfileData;
  it('sets both fields as hand edits, which a new extraction keeps', () => {
    const edited = withAudience(data, 'Landlords');
    expect(edited.brand!.audience).toMatchObject({ value: 'Landlords', source: 'manual', locked: true });
    expect(edited.market.audienceDescription).toMatchObject({ value: 'Landlords', source: 'manual' });
    expect(keepEdits(data, edited).brand!.audience.value).toBe('Landlords');
  });
  it('has a plain fallback sentence', () => {
    expect(audienceFromList(['strata', 'retail', 'schools'])).toBe('Clients in strata, retail and schools.');
    expect(audienceFromList(['strata'])).toBe('Clients in strata.');
  });
});
