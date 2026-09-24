/**
 * Evidence grounding for target-customer industries.
 * Fixture text is taken from the real avenue2.au crawl: the page only evidences auto
 * mechanics, yet the LLM padded the list with beauty salons, fitness studios and health
 * clinics from world knowledge. Those must be dropped.
 */
import { describe, expect, it } from 'vitest';
import { groundIndustries } from '../../../src/server/studio/grounding';
import { keywordInputFromProfile, keywordInputSignature } from '../../../src/server/studio/keywordDiscovery';
import type { StudioProfileData } from '../../../src/server/studio/types';

const AVENUE_TEXT = `Get booked straight from Google. Avenue's free form builder turns your Google listing into a branded booking form.
Your AI After-Hours Assistant answers every call. Built for service-based businesses.
“Avenue’s booking system implementation for my business websites has greatly improved our customer experience.” Ricci Jandu Owner at Wayne Park
210+ Bookings in our first month since implementing Avenue. Sean Radford Owner at Always There Automotive
Lachlan de Mezieres Owner at JC Automotives
Kellie Owner at Nash Street Mechanical
Troy Murray Owner of All Our Mechanical`;

describe('groundIndustries', () => {
  it('keeps an industry whose verbatim quote mentions it', () => {
    const r = groundIndustries([{ industry: 'auto mechanics', evidence: 'Owner at Nash Street Mechanical' }], AVENUE_TEXT);
    expect(r.industries).toEqual(['auto mechanics']);
    expect(r.evidence).toEqual(['Owner at Nash Street Mechanical']);
  });

  it('drops industries padded from world knowledge (quote not on the page)', () => {
    const r = groundIndustries(
      [
        { industry: 'auto mechanics', evidence: 'Owner of All Our Mechanical' },
        { industry: 'beauty salons', evidence: 'Owner at Glow Beauty Salon' },
        { industry: 'fitness studios', evidence: 'fitness studio owners love Avenue' },
      ],
      AVENUE_TEXT,
    );
    expect(r.industries).toEqual(['auto mechanics']);
  });

  it('drops an industry backed only by a generic real quote that does not name it', () => {
    const r = groundIndustries([{ industry: 'beauty salons', evidence: 'Built for service-based businesses' }], AVENUE_TEXT);
    expect(r.industries).toEqual([]);
  });

  it('drops plain strings with no evidence (old output shape)', () => {
    const r = groundIndustries(['auto mechanics', 'healthcare'], AVENUE_TEXT);
    expect(r.industries).toEqual([]);
  });

  it('tolerates curly quotes, case and punctuation differences in the quote', () => {
    const r = groundIndustries([{ industry: 'auto repair shops', evidence: '"owner at always there automotive"' }], AVENUE_TEXT);
    expect(r.industries).toEqual(['auto repair shops']);
  });

  it('dedupes and returns at most 5', () => {
    const r = groundIndustries(
      [
        { industry: 'auto mechanics', evidence: 'Nash Street Mechanical' },
        { industry: 'Auto Mechanics', evidence: 'All Our Mechanical' },
      ],
      AVENUE_TEXT,
    );
    expect(r.industries).toEqual(['auto mechanics']);
  });

  it('returns empty for non-array input', () => {
    expect(groundIndustries(null, AVENUE_TEXT).industries).toEqual([]);
  });
});

function profile(overrides: { idc: string[]; idcSource?: 'inferred' | 'manual'; idcEvidence?: string[] }): StudioProfileData {
  const e = <T,>(value: T) => ({ value, source: 'inferred' as const, confidence: 0.8, locked: false });
  return {
    classification: { vertical: e('saas'), subVertical: e(''), businessModel: e('b2b') },
    identity: { businessName: e('Avenue'), tagline: e(''), description: e(''), logoUrl: e<string | null>(null), primaryColor: e<string | null>(null) },
    positioning: { promoting: e('Booking software'), offer: e(''), positioning: e(''), geography: e('') },
    market: {
      audienceDescription: e(''),
      targetCustomerIndustries: { ...e(overrides.idc), source: overrides.idcSource ?? 'inferred', evidence: overrides.idcEvidence },
      competitors: e<string[]>([]),
      keywords: e<string[]>([]),
    },
    tone: { tone: e('casual'), hooks: e<string[]>([]) },
  };
}

describe('keywordInputFromProfile', () => {
  it('ignores ungrounded industries saved before evidence grounding', () => {
    const input = keywordInputFromProfile(profile({ idc: ['beauty salons', 'fitness studios'] }));
    expect(input.targetCustomerIndustries).toEqual([]);
  });

  it('keeps grounded industries', () => {
    const input = keywordInputFromProfile(profile({ idc: ['auto mechanics'], idcEvidence: ['Nash Street Mechanical'] }));
    expect(input.targetCustomerIndustries).toEqual(['auto mechanics']);
  });

  it('keeps industries the admin typed in', () => {
    const input = keywordInputFromProfile(profile({ idc: ['electricians', 'auto mechanics'], idcSource: 'manual' }));
    expect(input.targetCustomerIndustries).toEqual(['electricians', 'auto mechanics']);
  });

  it('signature changes when the admin edits the niches', () => {
    const before = keywordInputSignature(keywordInputFromProfile(profile({ idc: ['auto mechanics'], idcEvidence: ['x'] })));
    const after = keywordInputSignature(keywordInputFromProfile(profile({ idc: ['auto mechanics', 'electricians'], idcSource: 'manual' })));
    expect(after).not.toBe(before);
  });
});
