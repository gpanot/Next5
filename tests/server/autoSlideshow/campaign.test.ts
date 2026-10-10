import { describe, expect, it } from 'vitest';
import { planTimes } from '../../../src/components/admin/autoSlideshow/campaigns/scheduleTimes';
import { parseDraft } from '../../../src/server/autoSlideshow/campaign/store';
import { campaignProblems, emptyCampaignDraft, hookPhotoFor, type CampaignDraft } from '../../../src/types/admin/slideshowCampaign';

const ready = (): CampaignDraft => ({
  hooks: ['6 ways to get better at golf', '6 crazy ways to get better at golf'],
  hookPhotos: [0, 1, 2],
  cards: [
    { role: 'item', title: 'Grip lighter', body: '', photo: 3 },
    { role: 'cta', title: 'Follow for more', body: 'New tips every day', photo: 4 },
  ],
  look: 'default',
});

describe('emptyCampaignDraft', () => {
  it('starts with 7 slides: a hook, 5 content cards and a CTA last', () => {
    const d = emptyCampaignDraft();
    expect(d.cards).toHaveLength(6);
    expect(d.cards.slice(0, 5).every((c) => c.role === 'item')).toBe(true);
    expect(d.cards[5]!.role).toBe('cta');
  });
});

describe('hookPhotoFor', () => {
  it('pairs hook i with photo i and loops when photos run out', () => {
    const d = { hookPhotos: [7, 8, 9] };
    expect([0, 1, 2, 3, 4].map((i) => hookPhotoFor(d, i))).toEqual([7, 8, 9, 7, 8]);
  });

  it('is null without photos', () => {
    expect(hookPhotoFor({ hookPhotos: [] }, 0)).toBeNull();
  });
});

describe('campaignProblems', () => {
  it('is empty for a ready draft', () => {
    expect(campaignProblems(ready())).toEqual([]);
  });

  it('lists missing hooks, hook photos, card photos and headlines', () => {
    const problems = campaignProblems(emptyCampaignDraft());
    expect(problems[0]).toBe('Add at least one hook.');
    expect(problems[1]).toBe('Add at least one hook photo.');
    expect(problems).toContain('The CTA card needs a photo.');
    expect(problems).toContain('Content card 1 needs a headline.');
  });
});

describe('parseDraft', () => {
  it('drops photo indexes that do not exist, repeated hooks and empty lines', () => {
    const d = parseDraft({ ...ready(), hooks: [' a ', 'a', '', 'b'], hookPhotos: [0, 0, 9, -1, 1.5, 2] }, 5);
    expect(d.hooks).toEqual(['a', 'b']);
    expect(d.hookPhotos).toEqual([0, 2]);
  });

  it('makes the last card the CTA and keeps an unknown look as default', () => {
    const d = parseDraft({ ...ready(), cards: [{ title: 'x', photo: 99 }, { title: 'y', photo: 1 }], look: 'neon' }, 5);
    expect(d.cards.map((c) => c.role)).toEqual(['item', 'cta']);
    expect(d.cards[0]!.photo).toBeNull();
    expect(d.look).toBe('default');
  });

  it('refuses a draft without a content card', () => {
    expect(() => parseDraft({ ...ready(), cards: [{ title: 'only a CTA' }] }, 5)).toThrow();
  });
});

describe('planTimes', () => {
  const now = new Date(2026, 9, 10, 12, 0);

  it('posts one a day at the time from the first day', () => {
    const times = planTimes(3, 'daily', '2026-10-11', '18:00', now);
    expect(times.map((t) => [t.getDate(), t.getHours()])).toEqual([[11, 18], [12, 18], [13, 18]]);
  });

  it('posts all on the first day, two hours apart', () => {
    const times = planTimes(3, 'sameDay', '2026-10-11', '09:30', now);
    expect(times.map((t) => [t.getDate(), t.getHours(), t.getMinutes()])).toEqual([[11, 9, 30], [11, 11, 30], [11, 13, 30]]);
  });
});
