import { describe, expect, it } from 'vitest';
import { noEmDash } from '../../../src/server/slideshow/core/copyGuards';

describe('noEmDash', () => {
  it('turns an em dash between words into a comma', () => {
    expect(noEmDash('Old way — new way')).toBe('Old way, new way');
    expect(noEmDash('Old way—new way')).toBe('Old way, new way');
  });

  it('drops an em dash at the start or end of a line', () => {
    expect(noEmDash('— Save time')).toBe('Save time');
    expect(noEmDash('Save time —')).toBe('Save time');
  });

  it('never leaves a comma before punctuation', () => {
    expect(noEmDash('Why wait —?')).toBe('Why wait?');
    expect(noEmDash('Done — .')).toBe('Done.');
  });

  it('leaves text without an em dash alone', () => {
    expect(noEmDash('3–5 tips, no fluff.')).toBe('3–5 tips, no fluff.');
  });
});
