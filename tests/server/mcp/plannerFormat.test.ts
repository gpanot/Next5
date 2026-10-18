import { describe, expect, it } from 'vitest';
import { approvalPath, parsePins } from '../../../src/lib/approvalLink';
import { localTime, windowOf } from '../../../src/server/mcp/plannerFormat';

const SAIGON = -420; // getTimezoneOffset() at UTC+7

describe('localTime', () => {
  it('shows the workspace\'s own clock', () => {
    expect(localTime(new Date('2026-10-19T12:00:00Z'), SAIGON)).toBe('Mon 2026-10-19 19:00');
    expect(localTime(new Date('2026-10-19T12:00:00Z'), 0)).toBe('Mon 2026-10-19 12:00');
    expect(localTime(new Date('2026-10-19T02:30:00Z'), 240)).toBe('Sun 2026-10-18 22:30');
  });
});

describe('windowOf', () => {
  it('defaults to the days from tomorrow, local midnight to midnight', () => {
    const now = new Date('2026-10-18T20:00:00Z'); // already Oct 19 03:00 in Saigon
    const w = windowOf(undefined, 7, SAIGON, now);
    expect(w.from.toISOString()).toBe('2026-10-19T17:00:00.000Z'); // Oct 20 00:00 local
    expect(w.to.toISOString()).toBe('2026-10-26T17:00:00.000Z');
  });

  it('starts on a given day', () => {
    const w = windowOf('2026-10-19', 1, 0);
    expect(w.from.toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('ignores a malformed day', () => {
    const now = new Date('2026-10-18T10:00:00Z');
    expect(windowOf('19/10/2026', 1, 0, now).from.toISOString()).toBe('2026-10-19T00:00:00.000Z');
  });
});

describe('approval link', () => {
  it('opens the approval sheet and carries the pins back', () => {
    const at = new Date('2026-10-21T12:00:00Z');
    const path = approvalPath('ws_1', [{ slideshowId: 'cmabc12345', at }]);
    expect(path.startsWith('/slideshow/ws_1?')).toBe(true);
    const q = new URL(path, 'https://x.test').searchParams;
    expect(q.get('approve')).toBe('all');
    expect(q.get('view')).toBe('list');
    expect(parsePins(q.get('pins'))).toEqual({ cmabc12345: at.toISOString() });
  });

  it('has no pins parameter without slideshows, and drops bad pins', () => {
    expect(approvalPath('ws_1', [])).not.toContain('pins=');
    expect(parsePins('bad,x~y,ok12345678~2026-10-21T12:00:00Z,../../~2026-10-21T12:00:00Z')).toEqual({ ok12345678: '2026-10-21T12:00:00.000Z' });
    expect(parsePins(null)).toEqual({});
  });
});
