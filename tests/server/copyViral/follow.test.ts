import { describe, expect, it } from 'vitest';
import { followPointer } from '../../../src/components/admin/copyViral/recorder/follow';

describe('followPointer', () => {
  const script = 'If you want freedom, you need to save time.'.split(' ');

  it('moves on each said word, punctuation and case ignored', () => {
    expect(followPointer(script, ['if', 'you', 'want', 'Freedom'])).toBe(4);
  });

  it('skips fillers and jumps over a skipped word', () => {
    expect(followPointer(script, ['if', 'um', 'want', 'freedom'])).toBe(4);
  });

  it('never jumps far ahead on a word said again later', () => {
    expect(followPointer(script, ['time'])).toBe(0);
  });
});
