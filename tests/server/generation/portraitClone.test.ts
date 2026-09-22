import { describe, expect, it } from 'vitest';
import { ALL_BRAND_TEMPLATES } from '../../../src/content/business/catalog/templates';
import { INFLUENCER_SHOT_IDS, influencerShotFor } from '../../../src/content/business/catalog/influencerShots';
import { composeLockedPrompt, DESLOP_NEGATIVES, type IdentityLock } from '../../../src/server/generation/composer/portraitClone';
import { parseIdentityLock } from '../../../src/server/influencers/identityLock';
import { buildPortraitPrompt } from '../../../src/server/sets/portrait';

const lock: IdentityLock = {
  subject: { count: 1, gender: 'woman', apparent_age: '38' },
  face: { eyes: { type: 'monolid, crease 0 mm' } },
  hair: { color: 'dark brown #3B2A20' },
  critical_constraints: ['EYES: keep narrow monolid eyes'],
  negative_prompt: ['big round double-eyelid eyes'],
};

describe('portrait-clone locked prompts', () => {
  it('has a locked shot for every Brand style', () => {
    expect(ALL_BRAND_TEMPLATES).toHaveLength(18);
    for (const t of ALL_BRAND_TEMPLATES) expect(INFLUENCER_SHOT_IDS).toContain(t.id);
  });

  it('builds valid JSON with identity, de-slop negatives and a 9:16 frame', () => {
    const prompt = JSON.parse(composeLockedPrompt({ id: 'law_office', identity: lock, shot: influencerShotFor('law-office'), withReference: true })) as Record<string, unknown>;
    expect(Object.keys(prompt).slice(0, 4)).toEqual(['prompt_id', 'prompt_language', 'critical_constraints', 'negative_prompt']);
    const constraints = prompt.critical_constraints as string[];
    expect(constraints[0]).toMatch(/^IDENTITY:/);
    expect(constraints).toContain('EYES: keep narrow monolid eyes');
    expect(constraints.at(-1)).toMatch(/^MEDIUM:/);
    expect(prompt.negative_prompt).toEqual(expect.arrayContaining([...DESLOP_NEGATIVES, 'big round double-eyelid eyes']));
    expect(prompt.output).toMatchObject({ aspect_ratio: '9:16' });
    expect(JSON.stringify(prompt.scene)).toContain('law office');
  });

  it('keeps quality boosters out of the positive fields', () => {
    const prompt = JSON.parse(composeLockedPrompt({ id: 'x', identity: lock, shot: influencerShotFor('boardroom'), withReference: true })) as Record<string, unknown>;
    const positive = Object.entries(prompt).filter(([key]) => key !== 'negative_prompt');
    expect(JSON.stringify(positive)).not.toMatch(/\b(8K|4K|masterpiece|ultra-detailed|flawless|sharp focus)\b/i);
  });

  it('falls back to the reference image when there is no identity lock', () => {
    const prompt = JSON.parse(composeLockedPrompt({ id: 'x', identity: null, shot: influencerShotFor('unknown-style'), withReference: true })) as { subject: Record<string, string> };
    expect(prompt.subject.identity_source).toMatch(/reference image 1/);
  });

  it('builds the text-only base portrait without a reference constraint', () => {
    const prompt = JSON.parse(buildPortraitPrompt({ gender: 'man', age: 45, ethnicity: 'Black', additionalDetails: 'short grey beard' })) as { critical_constraints: string[]; subject: Record<string, string> };
    expect(prompt.critical_constraints.some((c) => c.startsWith('IDENTITY:'))).toBe(false);
    expect(prompt.subject).toMatchObject({ gender: 'man', apparent_age: '45', user_description: 'short grey beard' });
  });
});

describe('parseIdentityLock', () => {
  it('accepts a well-formed lock and drops empty lines', () => {
    const parsed = parseIdentityLock({ ...lock, critical_constraints: ['EYES: x', '', 3] });
    expect(parsed?.critical_constraints).toEqual(['EYES: x']);
  });

  it('rejects anything without subject, face and hair', () => {
    expect(parseIdentityLock(null)).toBeNull();
    expect(parseIdentityLock({ subject: {}, face: {} })).toBeNull();
    expect(parseIdentityLock('text')).toBeNull();
  });
});
