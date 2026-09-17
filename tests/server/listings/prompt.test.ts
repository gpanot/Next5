import { describe, expect, it } from 'vitest';
import { composeBrandPrompt } from '../../../src/server/generation/composer/brand';
import { composeListingPrompt } from '../../../src/server/generation/composer/listing';
import { roomPose, roomSceneId } from '../../../src/server/generation/composer/listingScenes';
import { OCCASIONS, occasionForStatus, occasionLabel } from '../../../src/lib/listingOccasions';
import { PHOTO_TAGS } from '../../../src/lib/listingPhotos';

const listing = {
  identityImageCount: 2,
  room: { kind: 'listing', label: '24 Oak St', tag: 'kitchen' },
  look: 0,
  occasion: 'just_listed' as const,
  wardrobe: 'smart_casual',
  poseEnergy: 'warm_approachable',
  brandColors: [] as string[],
  industry: 'realtor',
  format: 'portrait_4_5' as const,
};

describe('property prompt', () => {
  it('puts her inside her own photo and leaves the home exactly as it is', () => {
    const prompt = composeListingPrompt(listing);
    expect(prompt).toContain('Image 3 shows a real property (24 Oak St)');
    expect(prompt).toContain('Do not redecorate');
    expect(prompt).toContain('Keep the property exactly as photographed');
    expect(prompt).not.toContain('Setting:');
    expect(prompt).not.toContain('Scene:');
  });

  it('takes the pose from the room and the mood from the occasion', () => {
    const prompt = composeListingPrompt({ ...listing, occasion: 'just_sold' });
    expect(prompt).toContain(`Pose: ${roomPose('kitchen', 0)}`);
    expect(prompt).toContain('Mood: Joyful and celebrating');
  });

  it('never asks for something a home might not have without saying "if there is one"', () => {
    const risky = /\b(window|seating|dining table|patio|deck|vanity|bed)\b/i;
    for (const tag of PHOTO_TAGS) {
      for (let look = 0; look < 3; look += 1) {
        const pose = roomPose(tag, look);
        if (risky.test(pose)) expect(pose).toMatch(/if there is (one|any)/);
        // Nothing is opened, added or moved.
        expect(pose).not.toMatch(/\bopen(ing|s)? (the |a )?(door|window)|vase|flowers|sign|balcony/i);
      }
    }
  });

  it('gives three different poses per room, and neutral ones for an untagged photo', () => {
    for (const tag of [...PHOTO_TAGS, null]) {
      expect(new Set([0, 1, 2].map((look) => roomPose(tag, look))).size).toBe(3);
    }
    expect(roomPose(null, 0)).toContain('in the space');
    expect(roomSceneId('kitchen', 1)).toBe('kitchen-2');
    expect(roomSceneId('garage', 0)).toBe('room-1');
  });

  it('keeps brand colours on her outfit, never the room', () => {
    const prompt = composeListingPrompt({ ...listing, brandColors: ['navy'] });
    expect(prompt).toContain('outfit or accessories only');
    expect(prompt).not.toContain('décor');
  });
});

describe('just-me prompt', () => {
  it('still uses the set location', () => {
    const prompt = composeBrandPrompt({
      template: { locations: [{ id: 'office', label: 'Office', direction: 'A bright office.' }], lighting: 'Soft daylight.', defaults: {} },
      set: { locations: ['office'], wardrobe: null, poseEnergy: null, brandColors: [] },
      scene: { id: 'doorway', label: 'Doorway', direction: 'Standing in a doorway.' },
      index: 0, sceneCount: 1, format: 'portrait_4_5', industry: 'realtor', identityImageCount: 2,
    });
    expect(prompt).toContain('Setting: A bright office.');
    expect(prompt).not.toContain('Image 3 shows');
  });
});

describe('occasions', () => {
  it('maps only what Zillow actually says, and leaves the rest for her to pick', () => {
    expect(occasionForStatus('pending')).toBe('under_contract');
    expect(occasionForStatus('sold')).toBe('just_sold');
    expect(occasionForStatus('for_sale')).toBe('for_sale');
    expect(occasionForStatus('off_market')).toBeNull();
    expect(occasionForStatus(null)).toBeNull();
    expect(OCCASIONS).toHaveLength(6);
    expect(occasionLabel('open_house')).toBe('Open house');
    expect(occasionLabel('nope')).toBeNull();
  });
});
