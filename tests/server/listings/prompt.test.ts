import { describe, expect, it } from 'vitest';
import { composeBrandPrompt } from '../../../src/server/generation/composer/brand';

describe('brand prompt with her own place', () => {
  const base = {
    template: { locations: [{ id: 'office', direction: 'A bright office.' }], lighting: 'Soft daylight.', defaults: { wardrobe: 'smart', poseEnergy: 'calm' } },
    set: { locations: ['office'], wardrobe: null, poseEnergy: null, brandColors: [] },
    scene: { id: 'doorway', label: 'Doorway', direction: 'Standing in a doorway.' },
    index: 0,
    sceneCount: 1,
    format: 'portrait_4_5' as const,
    industry: 'real-estate',
    identityImageCount: 2,
  };

  it('uses the set location when her drop box is empty', () => {
    const prompt = composeBrandPrompt({ ...base, material: null } as never);
    expect(prompt).toContain('A bright office.');
    expect(prompt).not.toContain('Image 3 shows');
  });

  it('puts her inside her own listing, and tells the model to leave the place alone', () => {
    const prompt = composeBrandPrompt({ ...base, material: { kind: 'listing', label: '24 Oak St' } } as never);
    expect(prompt).toContain('Image 3 shows a real property (24 Oak St)');
    expect(prompt).toContain('unchanged');
    expect(prompt).toContain('Do not redecorate');
    expect(prompt).not.toContain('A bright office.'); // her place replaces the stock set
  });
});
