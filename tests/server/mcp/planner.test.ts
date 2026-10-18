// add_to_calendar: a pick that can't be scheduled goes back to the proposed ideas (the app keeps an idea only once
// it is made), so Claude can pick it again later instead of leaving it kept with no post.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const ideas = vi.hoisted(() => {
  const rows = new Map<string, { id: string; status: string; hook?: string; onDay?: boolean }>();
  const hooks = [{ id: 'hook:question', text: 'Other line?' }, { id: 'r1', text: 'Reserve line' }];
  const idea = (id: string, status: string, hook?: string) => ({
    id, status, format: 'blitz', plannedAt: '2026-10-20T19:00:00.000Z', hook: hook ?? `Hook ${id}`, hooks, outline: [], goal: null,
    coverUrl: null, slideshow: null, card: { shots: [{ text: 'a' }] },
  });
  return {
    rows,
    listIdeas: vi.fn(async () => ({ ideas: [...rows.values()].filter((r) => r.onDay !== false).map((r) => idea(r.id, r.status, r.hook)), batchSince: null })),
    patchIdea: vi.fn(async (_ws: string, id: string, patch: { status?: string; hookId?: string }) => {
      const row = rows.get(id);
      if (!row) throw new Error('Idea not found.');
      if (patch.hookId === 'hook:question') row.hook = 'Other line?';
      if (patch.hookId === 'r1') {
        rows.set('r1', { id: 'r1', status: row.status, hook: 'Reserve line' });
        row.onDay = false;
      }
      if (patch.status) row.status = patch.status;
    }),
  };
});

vi.mock('@vercel/functions', () => ({ waitUntil: () => undefined }));
vi.mock('../../../src/lib/db', () => ({ prisma: { blitzScheduledPost: { count: async () => 0 }, slideshowVariant: { findMany: async () => [] } } }));
vi.mock('../../../src/server/autoSlideshow/workspaces', () => ({
  requireSlideshowWorkspace: async () => ({ id: 'ws_1', name: 'Acme', ideaTzOffsetMin: 0 }),
  listSlideshowWorkspaces: async () => [],
}));
vi.mock('../../../src/server/slideshowCredits/charge', () => ({ affordableCredits: async () => 5 }));
vi.mock('../../../src/server/labs/calendarIdeas', () => ({
  OTHER_HOOK: 'hook:', listIdeas: ideas.listIdeas, patchIdea: ideas.patchIdea, createSlideshowIdeas: vi.fn(), generateIdeas: vi.fn(), makeSlideshowIdeas: vi.fn(),
}));
const scheduleBlitz = vi.hoisted(() => vi.fn());
vi.mock('../../../src/server/labs/blitzSchedule', () => ({ scheduleBlitz }));
vi.mock('../../../src/server/mcp/ideaRender', () => ({
  carouselTemplateId: async () => 'tmpl_1',
  buildIdeaRenderBody: () => ({ body: {} }),
}));

vi.mock('../../../src/server/mcp/ideaPhotos', () => ({ missingPhotos: () => [], brandOf: vi.fn(), fillMissingPhotos: vi.fn() }));

import { addToCalendar } from '../../../src/server/mcp/planner';

const caller = { userId: 'user_1', defaultWorkspaceId: 'ws_1' } as Parameters<typeof addToCalendar>[0];

describe('addToCalendar', () => {
  beforeEach(() => {
    ideas.rows.clear();
    ideas.rows.set('a', { id: 'a', status: 'proposed' });
    ideas.rows.set('b', { id: 'b', status: 'proposed' });
    scheduleBlitz.mockReset();
  });

  it('keeps the ideas it scheduled', async () => {
    scheduleBlitz.mockResolvedValue({});
    const res = await addToCalendar(caller, [{ id: 'a' }, { id: 'b' }]);
    expect(res.added.map((a) => a.id)).toEqual(['a', 'b']);
    expect(res.failed).toEqual([]);
    expect(ideas.rows.get('a')!.status).toBe('kept');
  });

  it('puts a pick that failed back to proposed', async () => {
    scheduleBlitz.mockImplementation(async (_ws: string, _u: string, b: { cardId: string }) => {
      if (b.cardId === 'b') throw new Error('Not enough credits.');
      return {};
    });
    const res = await addToCalendar(caller, [{ id: 'a' }, { id: 'b' }]);
    expect(res.added.map((a) => a.id)).toEqual(['a']);
    expect(res.failed).toEqual([{ id: 'b', reason: 'Not enough credits.' }]);
    expect(ideas.rows.get('a')!.status).toBe('kept');
    expect(ideas.rows.get('b')!.status).toBe('proposed');
  });

  it('opens a video with the other hook Claude picked', async () => {
    scheduleBlitz.mockResolvedValue({});
    const res = await addToCalendar(caller, [{ id: 'a', hook: 'other line?' }]);
    expect(res.added).toEqual([expect.objectContaining({ id: 'a', hook: 'Other line?' })]);
    expect(ideas.patchIdea).toHaveBeenCalledWith('ws_1', 'a', { hookId: 'hook:question' });
  });

  it('schedules the reserve card when its hook is picked, and says which idea it replaces', async () => {
    scheduleBlitz.mockResolvedValue({});
    const res = await addToCalendar(caller, [{ id: 'a', hook: 'Reserve line' }]);
    expect(res.added).toEqual([expect.objectContaining({ id: 'r1', replaces: 'a', hook: 'Reserve line' })]);
    expect(scheduleBlitz).toHaveBeenCalledWith('ws_1', 'user_1', expect.objectContaining({ cardId: 'r1' }));
  });

  it('refuses a hook the idea does not have', async () => {
    const res = await addToCalendar(caller, [{ id: 'a', hook: 'Made up' }]);
    expect(res.added).toEqual([]);
    expect(res.failed).toEqual([{ id: 'a', reason: 'That hook is not one of this idea\'s other_hooks.' }]);
    expect(ideas.rows.get('a')!.status).toBe('proposed');
  });
});
