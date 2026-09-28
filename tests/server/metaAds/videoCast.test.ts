import { describe, expect, it } from 'vitest';
import { applyCast, castBrief, nextCast, type Persona } from '../../../src/server/metaAds/video/cast';

const persona = (gender: string, age: number, ethnicity: string): Persona => ({ gender, age, ethnicity, look: 'navy blazer', setting: 'a home office' });

describe('nextCast', () => {
  it('lets the script model cast the first version', () => {
    expect(nextCast([])).toBeNull();
  });

  it('flips the gender and picks an unused age band and ethnicity', () => {
    const cast = nextCast([persona('woman', 34, 'White')]);
    expect(cast).toEqual({ gender: 'man', ageMin: 24, ageMax: 31, ethnicity: 'Black' });
  });

  it('treats close ethnicity labels as used', () => {
    const cast = nextCast([persona('woman', 26, 'White'), persona('man', 35, 'Black'), persona('female', 45, 'Latina')]);
    expect(cast?.gender).toBe('man');
    expect(cast?.ethnicity).toBe('East Asian');
    expect(cast?.ageMin).toBe(53);
  });

  it('picks the band furthest from the last age once all bands are used', () => {
    const previous = [persona('woman', 25, 'White'), persona('man', 35, 'Black'), persona('woman', 45, 'Latina'), persona('man', 60, 'East Asian')];
    expect(nextCast(previous)).toMatchObject({ gender: 'woman', ageMin: 24, ageMax: 31, ethnicity: 'Middle Eastern' });
  });
});

describe('applyCast', () => {
  it('forces gender, ethnicity and clamps age, keeping the look', () => {
    const cast = { gender: 'man' as const, ageMin: 42, ageMax: 52, ethnicity: 'South Asian' };
    expect(applyCast(persona('woman', 30, 'White'), cast)).toMatchObject({ gender: 'man', age: 42, ethnicity: 'South Asian', look: 'navy blazer' });
  });

  it('leaves the persona alone without a cast', () => {
    const p = persona('woman', 30, 'White');
    expect(applyCast(p, null)).toBe(p);
  });
});

describe('castBrief', () => {
  it('lists earlier people so the new one differs', () => {
    const previous = [persona('woman', 34, 'White')];
    const brief = castBrief(nextCast(previous), previous);
    expect(brief).toContain('CAST (required');
    expect(brief).toContain('woman, 34, White');
  });
});
