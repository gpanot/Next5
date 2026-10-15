import { describe, expect, it } from 'vitest';
import { countdownOfItem, SLIDESHOW_POST_MS, VIDEO_POST_MS } from '../../src/components/admin/autoSlideshow/calendar/tileModel';
import type { DayItem } from '../../src/components/admin/autoSlideshow/calendar/monthPlan';

const now = Date.parse('2026-10-14T19:00:00Z');
const blitz = (status: string, scheduledAt: string) => ({ kind: 'blitz', show: null, blitz: { status, scheduledAt } }) as unknown as DayItem;
const post = (status: string) => ({ kind: 'post', show: {}, post: { status, scheduledAt: '2026-10-14T18:59:00Z' } }) as unknown as DayItem;

describe('posting countdown on the calendar', () => {
  it('gives a video posted now 10 minutes', () => {
    expect(countdownOfItem(blitz('rendering', '2026-10-14T18:58:00Z'), now)).toMatchObject({ totalMs: VIDEO_POST_MS, since: '2026-10-14T18:58:00Z' });
    expect(countdownOfItem(blitz('processing', '2026-10-14T18:58:00Z'), now)?.totalMs).toBe(VIDEO_POST_MS);
  });

  it('shows none for a video made ahead of its day', () => {
    expect(countdownOfItem(blitz('rendering', '2026-10-14T19:50:00Z'), now)).toBeUndefined();
    expect(countdownOfItem(blitz('planned', '2026-10-14T18:58:00Z'), now)).toBeUndefined();
  });

  it('gives a slideshow being posted 3 minutes', () => {
    expect(countdownOfItem(post('sending'), now)?.totalMs).toBe(SLIDESHOW_POST_MS);
    expect(countdownOfItem(post('processing'), now)?.totalMs).toBe(SLIDESHOW_POST_MS);
    expect(countdownOfItem(post('scheduled'), now)).toBeUndefined();
    expect(countdownOfItem(post('posted'), now)).toBeUndefined();
  });
});
