import { describe, expect, it } from 'vitest';
import { buildMonth, currentPins, dropPins, emptySlots, monthCounts, toApprove, type PlanDay, type Pins, type Targets } from '../../../src/components/admin/autoSlideshow/calendar/monthPlan';
import type { AutoPostDto, AutoSlideshowDto } from '../../../src/types/admin/autoSlideshow';

const now = new Date(2026, 9, 1, 10, 0); // Thu Oct 1 2026, 10:00 local

const show = (position: number, status: AutoSlideshowDto['status'] = 'ready', post: AutoPostDto | null = null): AutoSlideshowDto => ({
  id: `s${position}`, position, modelId: null, modelName: 'm', hookPattern: 'h', topic: `t${position}`, goal: null, slides: [], caption: '', hashtags: [],
  audio: null, recommendedAudioId: null, post, posts: post ? [post] : [], status, error: null,
});

const post = (slideshowId: string, scheduledAt: Date, status: AutoPostDto['status'] = 'scheduled'): AutoPostDto => ({
  id: `p-${slideshowId}`, slideshowId, platform: 'tiktok', status, scheduledAt: scheduledAt.toISOString(), privacyLevel: 'SELF_ONLY', postUrl: null, error: null, attempts: 0, postedAt: null, stats: null, statsAt: null,
});

/** Each day's slot kinds, e.g. [['ready'], ['empty']]. */
const kinds = (days: PlanDay[]) => days.map((d) => d.slots.map((s) => s.item?.kind ?? 'empty'));

const october = new Date(2026, 9, 1);
type Extra = { pending?: number; working?: boolean; month?: Date; targets?: Targets; pins?: Pins };
const plan = (slideshows: AutoSlideshowDto[], extra: Extra = {}) =>
  buildMonth({ slideshows, pending: extra.pending ?? 0, working: extra.working, month: extra.month ?? october, targets: extra.targets, pins: extra.pins, now });
const dayOf = (days: PlanDay[], key: string) => days.find((d) => d.key === key)!;

describe('buildMonth', () => {
  it('shows whole Monday-Sunday weeks around the month', () => {
    const { days } = plan([]);
    expect(days[0]!.key).toBe('2026-09-28');
    expect(days.at(-1)!.key).toBe('2026-11-01');
    expect(days).toHaveLength(35);
    expect(days.find((d) => d.today)!.key).toBe('2026-10-01');
  });

  it('with no day picked, waiting slideshows go one a day from tomorrow at 7 PM, and nothing is empty', () => {
    const { days, all } = plan([show(0), show(1)]);
    expect(kinds([dayOf(days, '2026-10-02'), dayOf(days, '2026-10-03'), dayOf(days, '2026-10-04')])).toEqual([['ready'], ['ready'], []]);
    expect(dayOf(days, '2026-10-02').slots[0]!.at.getHours()).toBe(19);
    expect(emptySlots(all)).toBe(0);
    expect(toApprove(all).map((i) => i.show.id)).toEqual(['s0', 's1']);
  });

  it('a day set to 3 posts gets 3 slots at spread times; only that day changes', () => {
    const { days, all } = plan([], { targets: { '2026-10-21': 3 } });
    expect(dayOf(days, '2026-10-21').slots.map((s) => s.at.getHours())).toEqual([9, 13, 19]);
    expect(dayOf(days, '2026-10-22').slots).toHaveLength(0);
    expect(emptySlots(all)).toBe(3);
  });

  it('waiting slideshows fill the picked days first, in day order', () => {
    const { days } = plan([show(0), show(1)], { targets: { '2026-10-10': 1, '2026-10-05': 1 } });
    expect(dayOf(days, '2026-10-05').slots[0]!.item).toMatchObject({ show: { id: 's0' } });
    expect(dayOf(days, '2026-10-10').slots[0]!.item).toMatchObject({ show: { id: 's1' } });
    expect(dayOf(days, '2026-10-02').slots).toHaveLength(0);
  });

  it('keeps scheduled posts in their slot and counts them toward the day', () => {
    const scheduled = show(0, 'ready', post('s0', new Date(2026, 9, 2, 19, 0)));
    const { days, all } = plan([scheduled], { targets: { '2026-10-02': 2 } });
    expect(kinds([dayOf(days, '2026-10-02')])[0]).toEqual(['empty', 'post']);
    expect(monthCounts(days).scheduled).toBe(1);
    expect(emptySlots(all)).toBe(1);
  });

  it('shows past posts in their day', () => {
    const posted = show(0, 'ready', post('s0', new Date(2026, 8, 29, 19, 0), 'posted'));
    const { days } = plan([posted]);
    expect(dayOf(days, '2026-09-29').past).toBe(true);
    expect(kinds([dayOf(days, '2026-09-29')])[0]).toEqual(['post']);
  });

  it('approving takes slideshows on days after the month shown', () => {
    const many = Array.from({ length: 40 }, (_, i) => show(i));
    expect(toApprove(plan(many).all)).toHaveLength(40);
    expect(toApprove(plan([show(0)], { targets: { '2026-12-01': 1 } }).all)).toHaveLength(1);
  });

  it('puts canceled posts back in the queue and skips failed slideshows', () => {
    const canceled = show(0, 'ready', post('s0', new Date(2026, 9, 5, 19, 0), 'canceled'));
    const { days } = plan([canceled, show(1, 'failed')]);
    expect(dayOf(days, '2026-10-02').slots[0]!.item).toMatchObject({ kind: 'ready', show: { id: 's0' } });
    expect(kinds(days).flat()).toHaveLength(1);
  });

  it('a finished run shows no "Making…": half-made slideshows are left out', () => {
    const { days } = plan([show(0), show(1, 'written'), show(2, 'rendering')], { working: false });
    expect(kinds(days).flat()).toEqual(['ready']);
  });

  it('adding a day keeps the slideshows already made in place (pinned)', () => {
    const pins = currentPins(plan([show(0)]).all);
    const { days } = plan([show(0)], { targets: { '2026-10-21': 1 }, pins });
    expect(kinds([dayOf(days, '2026-10-02')])[0]).toEqual(['ready']);
    expect(kinds([dayOf(days, '2026-10-21')])[0]).toEqual(['empty']);
  });

  it('dropping a slideshow: on an empty day it moves there; on a full day it swaps with a ready one', () => {
    const { all } = plan([show(0), show(1)]);
    const moved = dropPins(all, 's0', dayOf(all, '2026-10-10'))!;
    expect(new Date(moved.s0!).getDate()).toBe(10);
    const swapped = dropPins(all, 's0', dayOf(all, '2026-10-03'))!;
    expect(new Date(swapped.s0!).getDate()).toBe(3);
    expect(new Date(swapped.s1!).getDate()).toBe(2);
    expect(dayOf(plan([show(0), show(1)], { pins: moved }).days, '2026-10-10').slots[0]!.item).toMatchObject({ show: { id: 's0' } });
  });

  it('dropping into an empty slot of a picked day uses that slot', () => {
    const { all } = plan([show(0)], { targets: { '2026-10-02': 1, '2026-10-12': 2 } });
    const moved = dropPins(all, 's0', dayOf(all, '2026-10-12'))!;
    expect(new Date(moved.s0!).getHours()).toBe(12);
  });

  it('a past day takes no drop', () => {
    const { all } = plan([show(0)]);
    expect(dropPins(all, 's0', all.find((d) => d.past)!)).toBeNull();
  });
});
