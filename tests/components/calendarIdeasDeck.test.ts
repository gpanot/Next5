import { describe, expect, it } from 'vitest';
import { deckOrder } from '../../src/components/admin/autoSlideshow/ideas/useIdeas';
import { entriesOf, statusOf } from '../../src/components/admin/autoSlideshow/calendar/tileModel';
import type { PlanDay } from '../../src/components/admin/autoSlideshow/calendar/monthPlan';
import type { BlitzScheduleDto } from '../../src/types/admin/blitzSchedule';
import { SLIDESHOW_AFTER, type IdeaDto } from '../../src/types/admin/calendarIdeas';

const idea = (id: string, format: IdeaDto['format'], extra: Partial<IdeaDto> = {}): IdeaDto => ({
  id, format, status: 'proposed', plannedAt: `2026-10-${String(10 + Number(id.replace(/\D/g, '') || 0)).padStart(2, '0')}T23:00:00.000Z`, hook: id,
  card: null, goal: null, coverUrl: null, outline: [], hooks: [], slideshow: format === 'slideshow' ? { state: 'ready', slides: ['/s.jpg'] } : null, ...extra,
});

describe('deckOrder', () => {
  it('shows the Blitz cards first and a ready slideshow after the first few', () => {
    const videos = Array.from({ length: 11 }, (_, i) => idea(`b${i}`, 'blitz'));
    const order = deckOrder([idea('s1', 'slideshow'), ...videos]).map((i) => i.id);
    expect(order.indexOf('s1')).toBe(SLIDESHOW_AFTER);
    expect(order).toHaveLength(12);
  });

  it('keeps a slideshow still being made out of the deck', () => {
    const order = deckOrder([idea('b1', 'blitz'), idea('s1', 'slideshow', { slideshow: { state: 'making', slides: [] } })]);
    expect(order.map((i) => i.id)).toEqual(['b1']);
  });

  it('puts the slideshow last when there are few videos', () => {
    expect(deckOrder([idea('s1', 'slideshow'), idea('b1', 'blitz'), idea('b2', 'blitz')]).map((i) => i.id)).toEqual(['b1', 'b2', 's1']);
  });
});

const blitz = (status: BlitzScheduleDto['status']): BlitzScheduleDto => ({ id: status, cardId: 'c', title: 'T', coverUrl: null, coverIsVideo: false, scheduledAt: '2026-10-12T19:00:00Z', status, postUrl: null, error: null });

describe('calendar tile statuses', () => {
  it('maps Blitz videos to the canvas statuses', () => {
    expect(statusOf({ kind: 'blitz', show: null, blitz: blitz('planned') })).toBe('ready');
    expect(statusOf({ kind: 'blitz', show: null, blitz: blitz('rendering') })).toBe('making');
    expect(statusOf({ kind: 'blitz', show: null, blitz: blitz('posted') })).toBe('scheduled');
    expect(statusOf({ kind: 'blitz', show: null, blitz: blitz('canceled') })).toBeNull();
  });

  it('lists a day\'s posts and kept ideas by time, without waiting or skipped ideas, and none on past days', () => {
    const day: PlanDay = { key: '2026-10-12', date: new Date(2026, 9, 12), past: false, today: false, inMonth: true, slots: [{ at: new Date('2026-10-12T12:00:00Z'), item: { kind: 'blitz', show: null, blitz: blitz('planned') } }] };
    const ideas = [idea('b1', 'blitz', { plannedAt: '2026-10-12T09:00:00Z' }), idea('b2', 'blitz', { status: 'discarded' }), idea('b3', 'blitz', { status: 'kept', plannedAt: '2026-10-12T20:00:00Z' })];
    expect(entriesOf(day, ideas).map((e) => [e.id, e.status])).toEqual([['planned', 'ready'], ['b3', 'kept']]);
    expect(entriesOf({ ...day, past: true }, ideas).map((e) => e.id)).toEqual(['planned']);
  });
});
