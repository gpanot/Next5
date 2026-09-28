import { describe, expect, it } from 'vitest';
import { composeVideoPrompt, enforceBeats, placeOnly, wordBudget } from '../../../src/server/metaAds/video/script';

const FACTS = 'Join 45,000+ resellers. Buyer protection on every order. Get up to 50% off.';

describe('wordBudget', () => {
  it('is about 2.3 spoken words per second', () => {
    expect([5, 10, 15].map(wordBudget)).toEqual([11, 23, 34]);
  });
});

describe('enforceBeats', () => {
  it('re-times beats back to back from 0 to the duration', () => {
    const { beats, problem } = enforceBeats(
      [
        { from: 0, to: 3, say: 'Still thrifting at 6am?', action: 'Leans in' },
        { from: 5, to: 9, say: 'Buyer protection on every order.', action: 'Shows phone' },
        { from: 9, to: 20, say: 'Tap Learn more.', action: 'Points down' },
      ],
      10,
      FACTS,
    );
    expect(problem).toBeNull();
    expect(beats[0].from).toBe(0);
    expect(beats.at(-1)?.to).toBe(10);
    beats.slice(1).forEach((b, i) => expect(b.from).toBe(beats[i].to));
  });

  it('drops middle beats with unprovable numbers or over the word budget, never the hook or CTA', () => {
    const { beats } = enforceBeats(
      [
        { say: 'Resellers, listen.' },
        { say: 'We ship in 2 hours to 90 countries with our amazing team of experts every single day of the week.' },
        { say: 'Join 45,000+ resellers.' },
        { say: 'Tap Learn more.' },
      ],
      5,
      FACTS,
    );
    expect(beats.map((b) => b.say)).toEqual(['Resellers, listen.', 'Join 45,000+ resellers.', 'Tap Learn more.']);
  });

  it('rejects a hook with a number the brand cannot prove', () => {
    expect(enforceBeats([{ say: 'Save 90% today.' }, { say: 'Tap Learn more.' }], 5, FACTS).problem).toMatch(/hook or CTA/);
  });
});

describe('composeVideoPrompt', () => {
  it('builds the Wan prompt from the checked beats, with no on-screen text', () => {
    const prompt = composeVideoPrompt({
      persona: { gender: 'man', age: 45, ethnicity: 'white', look: 'navy work overalls', setting: 'a small garage workshop' },
      beats: [{ from: 0, to: 5, say: 'Tap Learn more.', action: 'Points down' }],
      wordCount: 3,
      wordBudget: 11,
      why: '',
    });
    expect(prompt).toContain('Vertical 9:16');
    expect(prompt).toContain('[0-5s] Points down. Says: "Tap Learn more."');
    expect(prompt).not.toContain('..');
    expect(prompt).toContain('No on-screen text');
  });
});

describe('placeOnly', () => {
  it('keeps only the place when the model describes the filming', () => {
    expect(placeOnly('filmed on a smartphone in her service workshop office, holding the phone')).toBe('her service workshop office, holding the phone');
    expect(placeOnly('a small garage workshop')).toBe('a small garage workshop');
  });
});
