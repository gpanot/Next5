import { describe, expect, it } from 'vitest';
import { clip, wellFormed } from '../../../src/server/metaAds/text';

describe('clip', () => {
  it('never cuts an emoji in half', () => {
    const cut = clip(`${'x'.repeat(239)}🔥 rest`, 240);
    expect(cut).toBe('x'.repeat(239));
    expect(JSON.stringify(cut)).not.toContain('\\ud83d');
  });

  it('keeps whole emoji and short text untouched', () => {
    expect(clip('Deals 🔥 today', 240)).toBe('Deals 🔥 today');
    expect(clip('abc🔥', 5)).toBe('abc🔥');
  });
});

describe('wellFormed', () => {
  it('drops lone surrogates only', () => {
    expect(wellFormed('a\uD83Db🔥')).toBe('ab🔥');
  });
});
