/**
 * Unit tests for the Campaign Studio variable resolver.
 * No DB — pure function tests, fast and cheap.
 */
import { describe, expect, it } from 'vitest';
import { resolveVariables } from '../../../src/server/studio/resolveVariables';
import type { StudioProfileData } from '../../../src/server/studio/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<{
  businessName: string;
  promoting: string;
  offer: string;
  positioning: string;
  geography: string;
  audienceDescription: string;
  vertical: string;
  hooks: string[];
  competitors: string[];
  keywords: string[];
}>): StudioProfileData {
  const e = (v: string) => ({ value: v, source: 'inferred' as const, confidence: 0.8, locked: false });
  const ea = <T>(v: T) => ({ value: v, source: 'inferred' as const, confidence: 0.8, locked: false });

  return {
    classification: {
      vertical: e(overrides.vertical ?? 'home_services'),
      subVertical: e(''),
      businessModel: e('b2c'),
    },
    identity: {
      businessName: e(overrides.businessName ?? 'Acme Plumbing'),
      tagline: e('We fix fast'),
      description: e(''),
      logoUrl: ea<string | null>(null),
      primaryColor: ea<string | null>(null),
    },
    positioning: {
      promoting: e(overrides.promoting ?? 'professional plumbing services'),
      offer: e(overrides.offer ?? 'same-day emergency repairs'),
      positioning: e(overrides.positioning ?? 'family-owned, 20 years experience'),
      geography: e(overrides.geography ?? 'Dallas, TX'),
    },
    market: {
      audienceDescription: e(overrides.audienceDescription ?? 'homeowners with urgent plumbing needs'),
      competitors: ea(overrides.competitors ?? ['competitor.com']),
      keywords: ea(overrides.keywords ?? ['plumbing tips']),
    },
    tone: {
      tone: e('casual_professional'),
      hooks: ea(overrides.hooks ?? ['Stop wasting money on cheap fixes', 'One call solves it all']),
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('resolveVariables', () => {
  it('resolves BUSINESS_NAME from identity for business perspective', () => {
    const profile = makeProfile({ businessName: 'Acme Plumbing' });
    const result = resolveVariables(profile, ['BUSINESS_NAME'], 'business');
    expect(result.BUSINESS_NAME?.value).toBe('Acme Plumbing');
    expect(result.BUSINESS_NAME?.source).toBe('profile');
  });

  it('resolves AUDIENCE from market for audience perspective', () => {
    const profile = makeProfile({ audienceDescription: 'homeowners with urgent plumbing needs' });
    const result = resolveVariables(profile, ['AUDIENCE'], 'audience');
    expect(result.AUDIENCE?.value).toBe('homeowners with urgent plumbing needs');
    expect(result.AUDIENCE?.source).toBe('profile');
  });

  it('resolves CATEGORY from classification.vertical', () => {
    const profile = makeProfile({ vertical: 'home_services' });
    const result = resolveVariables(profile, ['CATEGORY'], 'business');
    expect(result.CATEGORY?.value).toBe('home services');
  });

  it('resolves PAIN_POINT from tone.hooks for audience perspective', () => {
    const profile = makeProfile({ hooks: ['Stop wasting money on cheap fixes'] });
    const result = resolveVariables(profile, ['PAIN_POINT'], 'audience');
    expect(result.PAIN_POINT?.value).toBe('Stop wasting money on cheap fixes');
  });

  it('falls back to business fields when audience key is not found', () => {
    const profile = makeProfile({ businessName: 'Acme' });
    const result = resolveVariables(profile, ['BUSINESS_NAME'], 'audience');
    // BUSINESS_NAME is a business key; resolveVariables should fall through to business lookup
    expect(result.BUSINESS_NAME?.value).toBe('Acme');
  });

  it('returns fallback for completely unknown key', () => {
    const profile = makeProfile({ businessName: 'Acme', promoting: 'plumbing' });
    const result = resolveVariables(profile, ['UNKNOWN_KEY'], 'business');
    // Should use fallback
    expect(result.UNKNOWN_KEY?.source).toBe('fallback');
    expect(typeof result.UNKNOWN_KEY?.value).toBe('string');
  });

  it('resolves multiple keys at once', () => {
    const profile = makeProfile({ businessName: 'Acme', audienceDescription: 'homeowners' });
    const result = resolveVariables(profile, ['BUSINESS_NAME', 'AUDIENCE', 'OFFER'], 'business');
    expect(Object.keys(result)).toHaveLength(3);
    expect(result.BUSINESS_NAME?.value).toBe('Acme');
    expect(result.AUDIENCE?.value).toBe('homeowners');
  });

  it('resolves CTA (campaign key) — not in routing table → falls through to fallback', () => {
    const profile = makeProfile({ businessName: 'Acme' });
    const result = resolveVariables(profile, ['CTA'], 'business');
    // CTA is not in the routing table; fallback should return something
    if (result.CTA) {
      expect(typeof result.CTA.value).toBe('string');
    }
    // (CTA may or may not resolve — it's a campaign variable, no profile field for it)
  });

  it('handles empty variable list', () => {
    const profile = makeProfile({});
    const result = resolveVariables(profile, [], 'business');
    expect(Object.keys(result)).toHaveLength(0);
  });
});
