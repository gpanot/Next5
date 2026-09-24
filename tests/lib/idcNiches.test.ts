import { describe, expect, it } from 'vitest';
import { readIdcNiches } from '../../src/components/labs/studio/runs/useIdcNiches';

const profile = (value: unknown) => ({ market: { targetCustomerIndustries: { value } } });

describe('readIdcNiches', () => {
  it('returns the trimmed IDC niches of a profile', () => {
    expect(readIdcNiches(profile([' auto mechanics ', 'electricians']))).toEqual(['auto mechanics', 'electricians']);
  });

  it('drops blanks, non-strings and duplicates', () => {
    expect(readIdcNiches(profile(['plumbers', '', 42, 'plumbers', '  ']))).toEqual(['plumbers']);
  });

  it('returns nothing when the profile has no IDC niches', () => {
    expect(readIdcNiches({})).toEqual([]);
    expect(readIdcNiches(profile(null))).toEqual([]);
    expect(readIdcNiches(profile('auto mechanics'))).toEqual([]);
  });
});
