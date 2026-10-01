import { describe, expect, it } from 'vitest';
import { buildMonth, currentPins, dropPins, emptyThrough, monthCounts, toApprove, type PlanDay, type Pins } from '../../../src/components/admin/autoSlideshow/calendar/monthPlan';
import type { AutoPostDto, AutoSlideshowDto } from '../../../src/types/admin/autoSlideshow';

const now = new Date(2026, 9, 1, 10, 0); // Thu Oct 1 2026, 10:00 local

const show = (position: number, status: AutoSlideshowDto['status'] = 'ready', post: AutoPostDto | null = null): AutoSlideshowDto => ({
  id: `s${position}`, position, modelId: null, modelName: 'm', hookPattern: 'h', topic: `t${position}`, goal: null, slides: [], caption: '', hashtags: [],
  audio: null, post, posts: post ? [post] : [], status, error: null,
});

const post = (slideshowId: string, scheduledAt: Date, status: AutoPostDto['status'] = 'scheduled'): AutoPostDto => ({
  id: `p-${slideshowId}`, slideshowId, platform: 'tiktok', status, scheduledAt: scheduledAt.toISOString(), privacyLevel: 'SELF_ONLY', postUrl: null, error: null, attempts: 0, postedAt: null, stats: null, statsAt: null,
});

/** Each day's slot kinds, e.g. [['ready'], ['empty']]. */
const kinds = (days: PlanDay[]) => days.map((d) => d.slots.map((s) => s.item?.kind ?? 'empty'));

const october = new Date(2026, 9, 1);
const plan = (slideshows: AutoSlideshowDto[], times: string[], extra: { pending?: number; working?: boolean; month?: Date; start?: Date; pins?: Pins } = {}) =>
  buildMonth({ slideshows, pending: extra.pending ?? 0, times, working: extra.working, month: extra.month ?? october, start: extra.start, pins: extra.pins, now });
/** Days from tomorrow (Oct 2) on. */
const future = (days: PlanDay[]) => days.filter((d) => !d.past);

describe('buildMonth', () => {
  it('shows whole Monday-Sunday weeks around the month', () => {
    const { days } = plan([], ['19:00']);
    expect(days[0]!.key).toBe('2026-09-28');
    expect(days.at(-1)!.key).toBe('2026-11-01');
    expect(days).toHaveLength(35);
    expect(days.filter((d) => d.inMonth)).toHaveLength(31);
    expect(days.find((d) => d.today)!.key).toBe('2026-10-01');
  });

  it('fills from tomorrow, one ready slideshow a day, then empty slots', () => {
    const { days, all } = plan([show(0), show(1)], ['19:00']);
    const next = future(days);
    expect(next[0]!.key).toBe('2026-10-02');
    expect(next[0]!.slots[0]!.at.getHours()).toBe(19);
    expect(kinds(next).flat().slice(0, 3)).toEqual(['ready', 'ready', 'empty']);
    expect(monthCounts(days)).toEqual({ ready: 2, scheduled: 0, posted: 0, empty: 28 });
    expect(toApprove(all).map((i) => i.show.id)).toEqual(['s0', 's1']);
  });

  it('fills several slots a day in time order', () => {
    const { days } = plan([show(0), show(1), show(2)], ['19:00', '09:00']);
    expect(kinds(future(days)).slice(0, 2)).toEqual([['ready', 'ready'], ['ready', 'empty']]);
    expect(future(days)[0]!.slots.map((s) => s.at.getHours())).toEqual([9, 19]);
  });

  it('keeps scheduled posts in their slot and fills around them', () => {
    const scheduled = show(0, 'ready', post('s0', new Date(2026, 9, 2, 19, 0)));
    const { days } = plan([scheduled, show(1), show(2, 'rendering')], ['19:00'], { pending: 1 });
    expect(kinds(future(days)).slice(0, 4)).toEqual([['post'], ['ready'], ['making'], ['making']]);
    expect(monthCounts(days).scheduled).toBe(1);
  });

  it("a post at another time uses one of the day's slots", () => {
    const scheduled = show(0, 'ready', post('s0', new Date(2026, 9, 2, 15, 0)));
    const { days } = plan([scheduled, show(1)], ['09:00', '19:00']);
    expect(kinds(future(days))[0]).toEqual(['ready', 'post']);
  });

  it('shows past posts in their day and counts them as posted', () => {
    const posted = show(0, 'ready', post('s0', new Date(2026, 8, 29, 19, 0), 'posted'));
    const { days } = plan([posted], ['19:00']);
    expect(days[1]!.key).toBe('2026-09-29');
    expect(days[1]!.past).toBe(true);
    expect(kinds(days)[1]).toEqual(['post']);
  });

  it('next month still fills from tomorrow: October slots come first', () => {
    const many = Array.from({ length: 35 }, (_, i) => show(i));
    const { days, all } = plan(many, ['19:00'], { month: new Date(2026, 10, 1) });
    expect(days[0]!.key).toBe('2026-10-26');
    expect(kinds(days.filter((d) => d.key >= '2026-11-01')).flat().slice(0, 6)).toEqual(['ready', 'ready', 'ready', 'ready', 'ready', 'empty']);
    expect(toApprove(all)).toHaveLength(35);
  });

  it('approving takes ready slideshows placed after the month shown', () => {
    const many = Array.from({ length: 40 }, (_, i) => show(i));
    const { all } = plan(many, ['19:00']);
    expect(toApprove(all)).toHaveLength(40);
  });

  it('puts canceled posts back in the queue and skips failed slideshows', () => {
    const canceled = show(0, 'ready', post('s0', new Date(2026, 9, 5, 19, 0), 'canceled'));
    const { days } = plan([canceled, show(1, 'failed')], ['09:30']);
    expect(future(days)[0]!.slots[0]!.item).toMatchObject({ kind: 'ready', show: { id: 's0' } });
    expect(kinds(days).flat().filter((k) => k !== 'empty')).toHaveLength(1);
  });

  it('"Add" on a day counts every empty slot up to that day, so the new ones land there', () => {
    const { all } = plan([show(0)], ['09:00', '19:00']);
    expect(emptyThrough(all, '2026-10-02')).toBe(1);
    expect(emptyThrough(all, '2026-10-04')).toBe(5);
  });

  it('a finished run shows no "Making…": half-made slideshows are left out', () => {
    const { days } = plan([show(0), show(1, 'written'), show(2, 'rendering')], ['19:00'], { working: false });
    expect(kinds(days).flat().filter((k) => k !== 'empty')).toEqual(['ready']);
  });

  it('a plan starting on the 21st fills from there: earlier days stay empty, "Generate" counts the planned slots', () => {
    const { days, all } = plan([show(0)], ['09:00', '19:00'], { start: new Date(2026, 9, 21) });
    const day = (key: string) => days.find((d) => d.key === key)!;
    expect(day('2026-10-20').slots).toHaveLength(0);
    expect(kinds([day('2026-10-21')])[0]).toEqual(['ready', 'empty']);
    expect(emptyThrough(all, '2026-10-31')).toBe(21);
  });

  it('a start in the past is moved to tomorrow', () => {
    const { days } = plan([show(0)], ['19:00'], { start: new Date(2026, 8, 1) });
    expect(kinds(future(days))[0]).toEqual(['ready']);
  });

  it('starting a plan mid-month keeps the slideshows already made in place (pinned)', () => {
    const before = plan([show(0)], ['19:00']);
    const pins = currentPins(before.all);
    const { days } = plan([show(0)], ['19:00'], { start: new Date(2026, 9, 21), pins });
    const day = (key: string) => days.find((d) => d.key === key)!;
    expect(kinds([day('2026-10-02')])[0]).toEqual(['ready']);
    expect(kinds([day('2026-10-21')])[0]).toEqual(['empty']);
  });

  it('dropping a slideshow on a free day moves it there; on a full day it swaps with a ready one', () => {
    const { all } = plan([show(0), show(1)], ['19:00']);
    const day = (key: string) => all.find((d) => d.key === key)!;
    const moved = dropPins(all, 's0', day('2026-10-10'), ['19:00'])!;
    expect(new Date(moved.s0!).getDate()).toBe(10);
    const swapped = dropPins(all, 's0', day('2026-10-03'), ['19:00'])!;
    expect(new Date(swapped.s0!).getDate()).toBe(3);
    expect(new Date(swapped.s1!).getDate()).toBe(2);
    const after = plan([show(0), show(1)], ['19:00'], { pins: moved });
    expect(after.days.find((d) => d.key === '2026-10-10')!.slots[0]!.item).toMatchObject({ show: { id: 's0' } });
  });

  it('a past day takes no drop', () => {
    const { all } = plan([show(0)], ['19:00']);
    expect(dropPins(all, 's0', all.find((d) => d.past)!, ['19:00'])).toBeNull();
  });
});
