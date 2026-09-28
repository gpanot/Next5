import { describe, expect, it } from 'vitest';
import { fillsTemplate, hookProblem, pickHooks } from '../../../src/server/metaAds/hooks';
import type { AdHook } from '../../../src/types/admin/metaAds';

const FACTS = 'Post 12 videos in 30 days. No filming.';

describe('fillsTemplate', () => {
  it('accepts a template with every slot filled', () => {
    expect(fillsTemplate('Stop [doing X]', 'Stop filming every listing')).toBe(true);
    expect(fillsTemplate("POV: you're [relatable situation]", "POV: you're out of listing videos")).toBe(true);
  });

  it('rejects changed template words or empty slots', () => {
    expect(fillsTemplate('Stop [doing X]', 'Quit filming every listing')).toBe(false);
    expect(fillsTemplate('[X] ways to [achieve goal]', '3 tricks to post more')).toBe(false);
    expect(fillsTemplate('Stop [doing X]', 'Stop [doing X]')).toBe(false);
  });

  it('ignores case and a closing punctuation mark', () => {
    expect(fillsTemplate('Want [dream outcome]?', 'want videos without filming?')).toBe(true);
    expect(fillsTemplate('Stop [doing X]', 'Stop filming.')).toBe(true);
  });
});

describe('hookProblem', () => {
  it('passes a short, true hook', () => {
    expect(hookProblem('Want [dream outcome]?', 'Want 12 videos in 30 days?', FACTS)).toBeNull();
  });

  it('flags length and unproven numbers', () => {
    expect(hookProblem('Want [dream outcome]?', 'Want a whole month of listing videos done?', FACTS)).toMatch(/over 32/);
    expect(hookProblem('Want [dream outcome]?', 'Want 50% more leads?', FACTS)).toMatch(/number/);
  });
});

describe('pickHooks', () => {
  const hook = (id: string, format: AdHook['format']): AdHook => ({ id, format, template: '', text: id });

  it('takes one per format first, then the best rest, in library order', () => {
    const valid = [hook('a1', 'label'), hook('a2', 'label'), hook('b1', 'command'), hook('c1', 'list')];
    expect(pickHooks(valid, 3).map((h) => h.id)).toEqual(['a1', 'b1', 'c1']);
    expect(pickHooks(valid, 4).map((h) => h.id)).toEqual(['a1', 'a2', 'b1', 'c1']);
  });
});
