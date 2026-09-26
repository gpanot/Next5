import { describe, expect, it } from 'vitest';
import { POSE_SHEET_POSES } from '../../../src/content/business/catalog/poseSheet';
import { composePoseSheetPrompt } from '../../../src/server/generation/composer/poseSheet';
import { MAX_SETS_PER_BATCH, parseDraft } from '../../../src/server/generation/draft';

const shopBody = (extra: Record<string, unknown>) => ({ kind: 'shop_products', setId: 'set-a', productIds: ['p1', 'p2'], packId: 'listing', formats: ['square_1_1'], ...extra });

describe('shop drafts with several models', () => {
  it('keeps the main set and drops it (and repeats) from the extra models', () => {
    const draft = parseDraft(shopBody({ setIds: ['set-b', 'set-a', 'set-b', 'set-c'] }));
    expect(draft).toMatchObject({ kind: 'shop_products', setId: 'set-a', setIds: ['set-b', 'set-c'] });
  });

  it('leaves setIds out when there is only one model', () => {
    expect(parseDraft(shopBody({ setIds: ['set-a'] }))).not.toHaveProperty('setIds');
    expect(parseDraft(shopBody({}))).not.toHaveProperty('setIds');
  });

  it('caps the number of models per batch', () => {
    const setIds = Array.from({ length: MAX_SETS_PER_BATCH }, (_, i) => `extra-${i}`);
    expect(() => parseDraft(shopBody({ setIds }))).toThrow(/up to/);
  });
});

describe('pose sheet prompt', () => {
  it('keeps the identity, plain basics, a clean studio and one pose per photo', () => {
    const prompts = POSE_SHEET_POSES.map((pose) => composePoseSheetPrompt(pose, 2, true));
    for (const prompt of prompts) {
      expect(prompt).toContain('Images 1 to 2 show the model');
      expect(prompt).toContain('plain fitted white T-shirt');
      expect(prompt).toContain('Seamless light-grey');
    }
    expect(new Set(prompts).size).toBe(POSE_SHEET_POSES.length);
  });
});
