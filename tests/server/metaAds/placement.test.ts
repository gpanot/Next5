import { describe, expect, it } from 'vitest';
import { choosePlacement } from '../../../src/server/metaAds/placement';

describe('choosePlacement', () => {
  it('keeps each layout in its usual spot when the face is clear of it', () => {
    expect(choosePlacement('UGC selfie', { top: 0.25, bottom: 0.45 })).toBe('bottom');
    expect(choosePlacement('Product hero', { top: 0.55, bottom: 0.8 })).toBe('top');
  });

  it('moves a top headline down when the face sits in the top third (the "24/7 bookings" case)', () => {
    expect(choosePlacement('Product hero', { top: 0.33, bottom: 0.5 })).toBe('bottom');
  });

  it('moves a bottom caption up when the face is low', () => {
    expect(choosePlacement('Testimonial', { top: 0.7, bottom: 0.88 })).toBe('top');
  });

  it('stays put when both spots overlap equally, or when nothing was found', () => {
    expect(choosePlacement('Lifestyle', { top: 0.05, bottom: 0.95 })).toBe('top');
    expect(choosePlacement('UGC selfie', null)).toBe('bottom');
  });
});

describe('withImageRules', async () => {
  const { withImageRules } = await import('../../../src/server/metaAds/copy');
  const old = 'UGC selfie of a tradie holding a phone, 4:5 portrait No text, letters, numbers, logos or brand names anywhere in the image. Plain unbranded clothing, packaging and screens.';

  it('replaces rules from older versions instead of stacking them', () => {
    const next = withImageRules(old, 'UGC selfie');
    expect(next.startsWith('UGC selfie of a tradie holding a phone, 4:5 portrait. Frame the face in the upper half')).toBe(true);
    expect(next).not.toContain('packaging and screens');
    expect(next.match(/No text, letters/g)).toHaveLength(1);
  });

  it('is idempotent', () => {
    const once = withImageRules(old, 'Product hero');
    expect(withImageRules(once, 'Product hero')).toBe(once);
  });
});
