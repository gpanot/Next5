import { describe, expect, it } from 'vitest';
import { planTimes } from '../../../src/components/admin/autoSlideshow/campaigns/scheduleTimes';
import { isBlankCampaign, parseDraft } from '../../../src/server/autoSlideshow/campaign/store';
import { autoSlideCount, campaignProblems, emptyCampaignDraft, hookNumber, hookPhotoFor, renderKeyOf, type CampaignDraft } from '../../../src/types/admin/slideshowCampaign';

const ready = (): CampaignDraft => ({
  hooks: ['6 ways to get better at golf', '6 crazy ways to get better at golf'],
  hookPhotos: [0, 1, 2],
  cards: [
    { role: 'item', title: 'Grip lighter', body: '', photo: 3 },
    { role: 'cta', title: 'Follow for more', body: 'New tips every day', photo: 4 },
  ],
  looks: { hook: 'default', content: 'default', cta: 'default' },
  caption: 'Golf tips #golf',
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
    const d = parseDraft({ ...ready(), cards: [{ title: 'x', photo: 99 }, { title: 'y', photo: 1 }], looks: { hook: 'neon', content: 'white-box', cta: 'tiktok-red' } }, 5);
    expect(d.cards.map((c) => c.role)).toEqual(['item', 'cta']);
    expect(d.cards[0]!.photo).toBeNull();
    expect(d.looks).toEqual({ hook: 'default', content: 'white-box', cta: 'tiktok-red' });
  });

  it('turns an old single look into the hook and CTA looks', () => {
    const old: Partial<CampaignDraft> & { look: string } = { ...ready(), look: 'white-box' };
    delete old.looks;
    expect(parseDraft(old, 5).looks).toEqual({ hook: 'white-box', content: 'default', cta: 'white-box' });
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

describe('renderKeyOf', () => {
  it('ignores the caption (not drawn) and changes with anything on the slides', () => {
    expect(renderKeyOf({ ...ready(), caption: 'other' })).toBe(renderKeyOf(ready()));
    expect(renderKeyOf({ ...ready(), looks: { ...ready().looks, content: 'tiktok-red' } })).not.toBe(renderKeyOf(ready()));
    expect(renderKeyOf({ ...ready(), hooks: ['new hook'] })).not.toBe(renderKeyOf(ready()));
  });
});

describe('hookNumber', () => {
  it('reads the count a hook promises, within the content slide limits', () => {
    expect(hookNumber('7 ways to fix your slice')).toBe(7);
    expect(hookNumber('Fix your slice')).toBeNull();
    expect(hookNumber('100 golf tips')).toBeNull();
  });
});

describe('autoSlideCount', () => {
  it('takes one less than the first hook number (the CTA is the last), else lets the writer decide', () => {
    expect(autoSlideCount(['6 unconventional way to choose your gym outfit'])).toBe(5);
    expect(autoSlideCount(['2 gym outfit rules'])).toBeNull();
    expect(autoSlideCount(['How to choose your gym outfit'])).toBeNull();
    expect(autoSlideCount([])).toBeNull();
  });
});

describe('isBlankCampaign', () => {
  const blank = () => ({ name: null, campaign: emptyCampaignDraft() as never, photos: [], photoJobs: null, slideshowCount: 0 });

  it('is blank when opened and left untouched, even with text looks changed', () => {
    expect(isBlankCampaign(blank())).toBe(true);
    expect(isBlankCampaign({ ...blank(), campaign: { ...emptyCampaignDraft(), looks: { hook: 'box', content: 'default', cta: 'default' } } as never })).toBe(true);
  });

  it('is not blank once anything is added', () => {
    const draft = emptyCampaignDraft();
    expect(isBlankCampaign({ ...blank(), name: 'Golf tips' })).toBe(false);
    expect(isBlankCampaign({ ...blank(), campaign: { ...draft, hooks: ['6 ways to golf'] } as never })).toBe(false);
    expect(isBlankCampaign({ ...blank(), campaign: { ...draft, caption: 'Golf' } as never })).toBe(false);
    expect(isBlankCampaign({ ...blank(), campaign: { ...draft, cards: draft.cards.map((c, i) => (i === 0 ? { ...c, title: 'Grip' } : c)) } as never })).toBe(false);
    expect(isBlankCampaign({ ...blank(), photos: [{ imageKey: 'k' }] as never })).toBe(false);
    expect(isBlankCampaign({ ...blank(), photoJobs: [{ status: 'running' }] as never })).toBe(false);
    expect(isBlankCampaign({ ...blank(), slideshowCount: 1 })).toBe(false);
  });
});

describe('parseDraft hookPhotoQuery', () => {
  it('keeps the hook photo search, trimmed, and drops an empty one', () => {
    expect(parseDraft({ ...ready(), hookPhotoQuery: '  golf course sunrise ' }, 5).hookPhotoQuery).toBe('golf course sunrise');
    expect(parseDraft({ ...ready(), hookPhotoQuery: '   ' }, 5)).not.toHaveProperty('hookPhotoQuery');
    expect(parseDraft({ ...ready(), hookPhotoQuery: 'x'.repeat(200) }, 5).hookPhotoQuery).toHaveLength(80);
  });
});
