/**
 * Unit tests for the vertical packs lookup.
 * No DB — pure function tests.
 */
import { describe, expect, it } from 'vitest';
import { getVerticalPack, KNOWN_VERTICALS } from '../../../src/server/studio/verticalPacks';

describe('verticalPacks', () => {
  it('returns the correct pack for real_estate', () => {
    const pack = getVerticalPack('real_estate');
    expect(pack.vertical).toBe('real_estate');
    expect(pack.researchKeywords.length).toBeGreaterThan(0);
    expect(pack.researchKeywords.every((k) => typeof k === 'string')).toBe(true);
  });

  it('returns the correct pack for each known vertical', () => {
    for (const vertical of KNOWN_VERTICALS) {
      const pack = getVerticalPack(vertical);
      expect(pack.vertical).toBe(vertical);
      expect(pack.researchKeywords.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('returns the generic fallback for unknown verticals', () => {
    const pack = getVerticalPack('unknown_vertical_xyz');
    expect(pack.vertical).toBe('generic');
    expect(pack.researchKeywords.length).toBeGreaterThan(0);
  });

  it('KNOWN_VERTICALS lists all archetypes', () => {
    expect(KNOWN_VERTICALS).toContain('real_estate');
    expect(KNOWN_VERTICALS).toContain('ecommerce');
    expect(KNOWN_VERTICALS).toContain('saas');
    expect(KNOWN_VERTICALS).toContain('restaurant');
    expect(KNOWN_VERTICALS).toContain('home_services');
    expect(KNOWN_VERTICALS).toContain('automotive');
    expect(KNOWN_VERTICALS).toContain('health_wellness');
    expect(KNOWN_VERTICALS).toContain('beauty_spa');
    expect(KNOWN_VERTICALS).toHaveLength(8);
  });

  it('researchKeywords are non-empty strings without trailing spaces', () => {
    for (const vertical of KNOWN_VERTICALS) {
      const { researchKeywords } = getVerticalPack(vertical);
      for (const kw of researchKeywords) {
        expect(kw.trim()).toBe(kw);
        expect(kw.length).toBeGreaterThan(3);
      }
    }
  });
});
