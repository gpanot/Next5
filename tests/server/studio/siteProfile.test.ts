/**
 * Shared company profile: StudioProfileData → Auto Slideshow's BrandProfile, and hand edits surviving a re-extraction.
 * No DB, no OpenAI.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

import { toBrandProfile } from '../../../src/server/studio/brandProfileAdapter';
import { keepEdits } from '../../../src/server/studio/siteProfile';
import type { FieldEnvelope, StudioProfileData } from '../../../src/server/studio/types';

const env = <T>(value: T, extra: Partial<FieldEnvelope<T>> = {}): FieldEnvelope<T> => ({ value, source: 'inferred', confidence: 0.8, locked: false, ...extra });

const profile = (overrides: Partial<StudioProfileData> = {}): StudioProfileData => ({
  classification: { vertical: env('beauty_spa'), subVertical: env('day spa'), businessModel: env('b2c') },
  identity: { businessName: env('Glow Spa'), tagline: env('Relax deeper'), description: env(''), logoUrl: env<string | null>(null), primaryColor: env<string | null>(null) },
  positioning: { promoting: env('Day spa for busy moms in Austin'), offer: env('Massage in 60 minutes'), positioning: env(''), geography: env('Austin') },
  market: { audienceDescription: env('Moms 30-45'), targetCustomerIndustries: env<string[]>([]), competitors: env<string[]>([]), keywords: env(['day spa austin']) },
  tone: { tone: env('casual_professional'), hooks: env<string[]>([]) },
  visual: {
    palette: env(['#f4c2c2']),
    faviconUrl: env<string | null>('https://glow.com/favicon.ico'),
    heroImageUrl: env<string | null>(null),
    slideshowStyle: env({ photoStyle: 'Moms in robes in a calm spa room', productAsSubject: false, boxColor: '#ffffff', boxTextColor: '#111111' }),
  },
  siteText: '## Homepage\nRelax deeper. 4.9 stars from 1,200 moms.',
  ...overrides,
});

describe('toBrandProfile', () => {
  it('maps the shared profile to the flat Auto Slideshow shape', () => {
    const flat = toBrandProfile(profile(), 'https://www.glow.com');
    expect(flat).toMatchObject({
      brandName: 'Glow Spa',
      domain: 'glow.com',
      valueProp: 'Day spa for busy moms in Austin',
      audience: 'Moms 30-45',
      tone: 'casual professional',
      productCategories: ['day spa'],
      palette: ['#f4c2c2'],
      faviconUrl: 'https://glow.com/favicon.ico',
      pageExcerpt: '## Homepage\nRelax deeper. 4.9 stars from 1,200 moms.',
      slideshowStyle: { photoStyle: 'Moms in robes in a calm spa room' },
    });
  });

  it('prefers the brand summary (Auto Slideshow prompt) over the short Blitz fields', () => {
    const flat = toBrandProfile(
      profile({
        brand: {
          valueProp: env('Glow Spa runs calm day spas in Austin with 60-minute massages and facials.'),
          audience: env('Busy moms in Austin who want an hour to themselves.'),
          tone: env('warm, calm, plain'),
          productCategories: env(['massage', 'facials']),
        },
      }),
      'https://glow.com',
    );
    expect(flat.valueProp).toBe('Glow Spa runs calm day spas in Austin with 60-minute massages and facials.');
    expect(flat.audience).toBe('Busy moms in Austin who want an hour to themselves.');
    expect(flat.tone).toBe('warm, calm, plain');
    expect(flat.productCategories).toEqual(['massage', 'facials']);
  });

  it('works on profiles made before the visual fields', () => {
    const flat = toBrandProfile(profile({ visual: undefined, siteText: undefined }), 'https://glow.com');
    expect(flat.palette).toEqual([]);
    expect(flat.pageExcerpt).toBe('');
    expect(flat.slideshowStyle).toBeUndefined();
  });
});

describe('keepEdits', () => {
  it('keeps locked and manual fields from the old version, takes the rest fresh', () => {
    const old = profile({
      identity: { ...profile().identity, businessName: env('Glow Day Spa', { source: 'manual', confidence: 1 }) },
      tone: { tone: env('witty', { locked: true }), hooks: env<string[]>([]) },
    });
    const fresh = profile({ positioning: { ...profile().positioning, offer: env('New offer') } });
    const merged = keepEdits(fresh, old);
    expect(merged.identity.businessName.value).toBe('Glow Day Spa');
    expect(merged.identity.tagline.value).toBe('Relax deeper');
    expect(merged.tone.tone.value).toBe('witty');
    expect(merged.positioning.offer.value).toBe('New offer');
    expect(merged.siteText).toBe(fresh.siteText);
  });
});
