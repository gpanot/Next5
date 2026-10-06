import { describe, expect, it } from 'vitest';
import { postedStamp } from '../../src/components/labs/blitzLab/schedule/postedStamp';
import type { BlitzScheduleDto } from '../../src/types/admin/blitzSchedule';

const post = (postedAt: string | null, scheduledAt = '2026-10-01T09:00:00'): BlitzScheduleDto => ({
  id: 'p', cardId: 'c', title: 'T', coverUrl: null, coverIsVideo: false, scheduledAt, status: 'posted', postUrl: null, error: null, platform: 'youtube', projectId: 'v', postedAt,
});

describe('postedStamp', () => {
  it('shows the posted time as MM/DD/YY h:mmam/pm in local time', () => {
    expect(postedStamp(post(new Date(2026, 9, 7, 16, 31).toISOString()))).toBe('10/07/26 4:31pm');
    expect(postedStamp(post(new Date(2026, 0, 5, 0, 5).toISOString()))).toBe('01/05/26 12:05am');
    expect(postedStamp(post(new Date(2026, 11, 31, 12, 0).toISOString()))).toBe('12/31/26 12:00pm');
  });

  it('falls back to the scheduled time for posts saved before postedAt existed', () => {
    expect(postedStamp(post(null, new Date(2026, 9, 6, 9, 3).toISOString()))).toBe('10/06/26 9:03am');
  });
});
