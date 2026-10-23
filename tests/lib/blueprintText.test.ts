import { describe, expect, it } from 'vitest';
import { defaultPlan, emptyTopics, type BlueprintDto } from '../../src/lib/blueprint/schema';
import { blueprintText, scriptText, teleprompterItems } from '../../src/lib/blueprint/text';
import { findPlaceholders, scriptPlaceholders, type Script } from '../../src/lib/scriptGenerator/types';

const script: Script = {
  title: 'Price it right',
  hook: { visual: 'Holding a sheet', onScreen: 'Stop guessing', spoken: 'Selling your first home?' },
  beats: [
    { label: 'THE MISTAKE', spoken: 'Most people price high.', onScreen: 'Priced high', visual: 'Shake head', rehook: 'But here is why.' },
    { label: 'THE FIX', spoken: 'I priced [your street] under comps.', onScreen: '', visual: 'Point at sheet', rehook: '' },
    { label: 'PROOF', spoken: '4 offers in a weekend.', onScreen: '4 offers', visual: '[the house]', rehook: '' },
  ],
  cta: 'Follow for more.',
  caption: 'Price it right.',
  tips: ['Film by a window'],
};

describe('placeholders', () => {
  it('finds bracketed details in seen or spoken text only', () => {
    expect(findPlaceholders('I started in [the year] and [b]')).toEqual(['[the year]']);
    expect(scriptPlaceholders(script)).toEqual(['[your street]']);
  });
});

describe('teleprompterItems', () => {
  it('reads the spoken lines on a talking head', () => {
    expect(teleprompterItems(script, 'talking').map((i) => i.tag)).toEqual(['Hook', 'THE MISTAKE', 'THE FIX', 'PROOF', 'Close']);
    expect(teleprompterItems(script, 'talking')[0].text).toBe('Selling your first home?');
  });

  it('reads the on-screen text with the shot note otherwise, skipping empty slides', () => {
    const items = teleprompterItems(script, 'broll');
    expect(items.map((i) => i.tag)).toEqual(['Hook', 'Shot 1', 'Shot 3', 'Close']);
    expect(items[1]).toEqual({ tag: 'Shot 1', text: 'Priced high', note: 'Shake head' });
  });
});

describe('text exports', () => {
  it('names slides on a carousel and keeps re-hooks', () => {
    const text = scriptText(script, 'carousel');
    expect(text).toContain('SLIDE 1');
    expect(text).toContain('Re-hook: But here is why.');
  });

  it('summarises topics, days, checks and scripts', () => {
    const topics = emptyTopics();
    topics.skills[0] = { text: 'Pricing', main: true };
    topics.skills[1] = { text: 'Staging', main: false };
    const plan = defaultPlan();
    plan[0] = { ...plan[0], topic: 'Pricing', script, checks: [true, false, false] };
    const bp: BlueprintDto = { id: 'b', topics, about: { aud: '', off: '', cred: '', voice: '' }, plan, step: 5, version: 1, updatedAt: '' };
    const text = blueprintText(bp);
    expect(text).toContain('* Pricing');
    expect(text).toContain('- Staging (extra)');
    expect(text).toContain('DAY 1: Skill / Talking head');
    expect(text).toContain('[x] Strong hook  [ ] Real value');
    expect(text).toContain('Status: Fill in your details');
    expect(text).not.toMatch(/—/);
  });
});
