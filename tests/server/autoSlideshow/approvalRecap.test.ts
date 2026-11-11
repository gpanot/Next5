import { describe, expect, it } from 'vitest';
import { localDay } from '../../../src/server/autoSlideshow/approvalRecap';
import { approveTodayEmail } from '../../../src/server/email/templates';

describe('localDay', () => {
  it('reads the hour, date and day end in the user’s zone', () => {
    // 12:30 UTC is 8:30 am in New York (EDT, offset 240).
    const day = localDay(new Date('2026-10-18T12:30:00Z'), 240);
    expect(day.hour).toBe(8);
    expect(day.date).toBe('2026-10-18');
    expect(day.end.toISOString()).toBe('2026-10-19T04:00:00.000Z');
  });

  it('stays on the user’s date when UTC has moved on', () => {
    const day = localDay(new Date('2026-10-19T02:00:00Z'), 420); // 7 pm in Los Angeles (PDT)
    expect(day.date).toBe('2026-10-18');
    expect(day.hour).toBe(19);
  });
});

describe('approveTodayEmail', () => {
  it('lists today’s posts in local time and links the list view on that day', () => {
    const email = approveTodayEmail('ws1', '2026-10-18', [
      { title: 'Stop choosing', at: new Date('2026-10-18T23:00:00Z'), thumbUrl: 'https://app.test/api/thumb/a.jpg' },
      { title: 'Gym comfort', at: new Date('2026-10-19T00:00:00Z'), thumbUrl: null },
    ], 240);
    expect(email.subject).toBe('2 posts need your OK today');
    expect(email.items?.[0]).toEqual({ text: '7:00 PM · Stop choosing', imageUrl: 'https://app.test/api/thumb/a.jpg' });
    expect(email.items?.[1]?.imageUrl).toBeNull();
    expect(email.body.at(-1)).toBe('Approve before 7:00 PM so the first one goes out on time.');
    expect(email.cta?.url).toMatch(/\/slideshow\/ws1\?view=list&day=2026-10-18$/);
  });
});
