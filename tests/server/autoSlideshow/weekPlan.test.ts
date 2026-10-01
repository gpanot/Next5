import { describe, expect, it } from 'vitest';
import { buildPlan, emptyThrough, openSlots, toApprove, type PlanDay } from '../../../src/components/admin/autoSlideshow/calendar/weekPlan';
import type { AutoPostDto, AutoSlideshowDto } from '../../../src/types/admin/autoSlideshow';

const now = new Date(2026, 9, 1, 10, 0); // Thu Oct 1 2026, 10:00 local

const show = (position: number, status: AutoSlideshowDto['status'] = 'ready', post: AutoPostDto | null = null): AutoSlideshowDto => ({
  id: `s${position}`, position, modelId: null, modelName: 'm', hookPattern: 'h', topic: `t${position}`, slides: [], caption: '', hashtags: [],
  audio: null, post, posts: post ? [post] : [], status, error: null,
});

const post = (slideshowId: string, scheduledAt: Date, status: AutoPostDto['status'] = 'scheduled'): AutoPostDto => ({
  id: `p-${slideshowId}`, slideshowId, platform: 'tiktok', status, scheduledAt: scheduledAt.toISOString(), privacyLevel: 'SELF_ONLY', postUrl: null, error: null, attempts: 0, postedAt: null, stats: null, statsAt: null,
});

/** Each day's slot kinds, e.g. [['ready'], ['empty']]. */
const kinds = (days: PlanDay[]) => days.map((d) => d.slots.map((s) => s.item?.kind ?? 'empty'));

describe('buildPlan', () => {
  it('starts tomorrow, one ready slideshow a day, then empty slots to fill the week', () => {
    const days = buildPlan({ slideshows: [show(0), show(1)], pending: 0, times: ['19:00'], now });
    expect(days).toHaveLength(7);
    expect(days[0]!.key).toBe('2026-10-02');
    expect(days[0]!.slots[0]!.at.getHours()).toBe(19);
    expect(kinds(days).flat()).toEqual(['ready', 'ready', 'empty', 'empty', 'empty', 'empty', 'empty']);
    expect(openSlots(days)).toBe(5);
    expect(toApprove(days).map((i) => i.show.id)).toEqual(['s0', 's1']);
  });

  it('fills several slots a day in time order', () => {
    const days = buildPlan({ slideshows: [show(0), show(1), show(2)], pending: 0, times: ['19:00', '09:00'], now });
    expect(kinds(days).slice(0, 2)).toEqual([['ready', 'ready'], ['ready', 'empty']]);
    expect(days[0]!.slots.map((s) => s.at.getHours())).toEqual([9, 19]);
    expect(openSlots(days)).toBe(11);
  });

  it('keeps scheduled posts in their slot and fills around them', () => {
    const scheduled = show(0, 'ready', post('s0', new Date(2026, 9, 2, 19, 0)));
    const days = buildPlan({ slideshows: [scheduled, show(1), show(2, 'rendering')], pending: 1, times: ['19:00'], now });
    expect(kinds(days).slice(0, 4)).toEqual([['post'], ['ready'], ['making'], ['making']]);
    expect(toApprove(days)).toHaveLength(1);
  });

  it('a post at another time uses one of the day\'s slots', () => {
    const scheduled = show(0, 'ready', post('s0', new Date(2026, 9, 2, 15, 0)));
    const days = buildPlan({ slideshows: [scheduled, show(1)], pending: 0, times: ['09:00', '19:00'], now });
    expect(kinds(days)[0]).toEqual(['ready', 'post']);
  });

  it('shows this week\'s past posts and grows to more weeks when needed', () => {
    const posted = show(0, 'ready', post('s0', new Date(2026, 8, 29, 19, 0), 'posted'));
    const many = Array.from({ length: 9 }, (_, i) => show(i + 1));
    const days = buildPlan({ slideshows: [posted, ...many], pending: 0, times: ['19:00'], now });
    expect(days[0]!.key).toBe('2026-09-29');
    expect(days[0]!.past).toBe(true);
    expect(days.length % 7).toBe(0);
    expect(toApprove(days)).toHaveLength(9);
  });

  it('puts canceled posts back in the queue and skips failed slideshows', () => {
    const canceled = show(0, 'ready', post('s0', new Date(2026, 9, 5, 19, 0), 'canceled'));
    const days = buildPlan({ slideshows: [canceled, show(1, 'failed')], pending: 0, times: ['09:30'], now });
    expect(days[0]!.slots[0]!.item).toMatchObject({ kind: 'ready', show: { id: 's0' } });
    expect(kinds(days).flat().filter((k) => k !== 'empty')).toHaveLength(1);
  });

  it('"Add" on a day counts every empty slot up to that day, so the new ones land there', () => {
    const days = buildPlan({ slideshows: [show(0)], pending: 0, times: ['09:00', '19:00'], now });
    expect(emptyThrough(days, days[0]!.key)).toBe(1);
    expect(emptyThrough(days, days[2]!.key)).toBe(5);
  });

  it('a finished run shows no "Making…": half-made slideshows are left out', () => {
    const days = buildPlan({ slideshows: [show(0), show(1, 'written'), show(2, 'rendering')], pending: 0, times: ['19:00'], working: false, now });
    expect(kinds(days).flat().filter((k) => k !== 'empty')).toEqual(['ready']);
  });
});
