import { describe, expect, it } from 'vitest';
import { isNumbered, numberCards, stripNumber } from '../../../src/types/admin/campaignNumbering';
import { autoSlideCount, type CampaignCard } from '../../../src/types/admin/slideshowCampaign';
import { TEXT_SIDE } from '../../../src/config/tiktokSafeZone';
import { clampTextX, textSpan } from '../../../src/types/slideText';

const card = (title: string, role: CampaignCard['role'] = 'item'): CampaignCard => ({ role, title, body: '', photo: null });

describe('numbering', () => {
  it('adds and removes numbers, keeping "3.5 million" text', () => {
    const cards = [card('Sit right'), card('Step 2: Brake early'), card('3.5 million drivers do it'), card('Follow for more', 'cta')];
    const on = numberCards({ hooks: ['Top tips'], cards }, true);
    expect(on.map((c) => c.title)).toEqual(['1. Sit right', '2. Brake early', '3. 3.5 million drivers do it', 'Follow for more']);
    expect(isNumbered(on)).toBe(true);
    expect(numberCards({ hooks: [], cards: on }, false).map((c) => c.title)).toEqual(['Sit right', 'Brake early', '3.5 million drivers do it', 'Follow for more']);
    expect(stripNumber('3.5 million')).toBe('3.5 million');
  });

  it('numbers the CTA when it closes the hook count', () => {
    const cards = [card('A'), card('B'), card('Get the app', 'cta')];
    expect(numberCards({ hooks: ['3 ways to win'], cards }, true).map((c) => c.title)).toEqual(['1. A', '2. B', '3. Get the app']);
  });
});

describe('autoSlideCount', () => {
  it('leaves the last promised item to the CTA', () => {
    expect(autoSlideCount(['6 ways to drive a sport car'])).toBe(5);
    expect(autoSlideCount(['2 tips'])).toBeNull();
    expect(autoSlideCount(['How to drive'])).toBeNull();
  });
});

describe('textSpan', () => {
  it('is the full width centered and narrows toward a side, never closer to an edge than TEXT_SIDE', () => {
    const center = textSpan(0.5, TEXT_SIDE);
    expect(center.left).toBeCloseTo(0.136);
    expect(center.right).toBeCloseTo(0.136);
    const left = textSpan(0.4, TEXT_SIDE);
    expect(left.left).toBeCloseTo(0.136);
    expect(1 - left.left - left.right).toBeCloseTo(0.528);
    expect(clampTextX(0)).toBeCloseTo(0.336);
  });
});
