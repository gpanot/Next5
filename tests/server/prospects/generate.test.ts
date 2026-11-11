// "Generate calendar": only a video with no render, or whose card changed since its render, renders; the days then come
// from the calendar and the link opens. A failed video sends the pack back to review with the reason.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = {
    pack: {} as Record<string, unknown>,
    cards: {} as Record<string, unknown>,
    projects: [] as Array<{ id: string; renderStatus: string; renderError: string | null }>,
  };
  const prisma = {
    prospectPack: {
      findUnique: vi.fn(async () => ({ ...state.pack })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(state.pack, data)),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (where.status && where.status !== state.pack.status) return { count: 0 };
        Object.assign(state.pack, data);
        return { count: 1 };
      }),
    },
    slideshowVariant: { findMany: vi.fn(async () => Object.keys(state.cards).map((id) => ({ id }))) },
    blitzProject: { findMany: vi.fn(async () => state.projects) },
    workspace: { findUniqueOrThrow: vi.fn(async () => ({ ideaTzOffsetMin: 0 })) },
  };
  return { state, prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));
const render = vi.hoisted(() => ({ renderBlitz: vi.fn(async (_u: string, _w: string, _n: string, ideas: Array<{ id: string }>) => ideas.map((i) => ({ ideaId: i.id, projectId: `new_${i.id}` }))) }));
vi.mock('../../../src/server/prospects/blitz', () => ({
  keptIdeas: vi.fn(async (_w: string, ids: string[]) => ids.map((id) => ({ id, card: db.state.cards[id] }))),
  renderBlitz: render.renderBlitz,
}));
const days = [{ day: 1, at: '2026-11-03T02:00:00.000Z', kind: 'blitz', refId: 'x' }];
vi.mock('../../../src/server/prospects/calendarPlan', () => ({ daysFromCalendar: vi.fn(async () => days), putOnCalendar: vi.fn(async () => undefined) }));

import { reopenReview, startGenerating, stepGenerating } from '../../../src/server/prospects/generate';
import type { ProspectPack } from '@prisma/client';

const step = () => stepGenerating({ ...db.state.pack } as unknown as ProspectPack);
const blitz = () => db.state.pack.blitz as Array<Record<string, unknown>>;

beforeEach(() => {
  db.state.cards = { a: { hook: 'A' }, b: { hook: 'B' } };
  db.state.projects = [];
  db.state.pack = {
    id: 'pp', workspaceId: 'ws', ownerUserId: 'u', name: 'Acme', status: 'review', updatedAt: new Date(), error: 'old', days: [],
    blitz: [{ ideaId: 'a', projectId: null, held: true }, { ideaId: 'b', projectId: null, preview: true }],
  };
  render.renderBlitz.mockClear();
});

describe('generate calendar', () => {
  it('refuses a pack not in review', async () => {
    db.state.pack.status = 'ready';
    await expect(startGenerating('pp')).rejects.toMatchObject({ code: 'not_review' });
  });

  it('renders held videos only (never previews), waits, then opens the link with the calendar days', async () => {
    await startGenerating('pp');
    expect(db.state.pack).toMatchObject({ status: 'generating', error: null });
    await step();
    expect(render.renderBlitz.mock.calls[0]![3].map((i: { id: string }) => i.id)).toEqual(['a']);
    expect(blitz()[0]).toMatchObject({ ideaId: 'a', projectId: 'new_a' });
    expect(blitz()[0]!.cardHash).toBeTruthy();

    db.state.projects = [{ id: 'new_a', renderStatus: 'PROCESSING', renderError: null }];
    await step();
    expect(db.state.pack.status).toBe('generating');

    db.state.projects = [{ id: 'new_a', renderStatus: 'COMPLETED', renderError: null }];
    await step();
    expect(db.state.pack).toMatchObject({ status: 'ready', days });
    expect(render.renderBlitz).toHaveBeenCalledTimes(1);
  });

  it('sends the pack back to review when a render fails, and tries that video again on the next tap', async () => {
    db.state.pack.status = 'generating';
    await step();
    db.state.projects = [{ id: 'new_a', renderStatus: 'FAILED', renderError: 'boom' }];
    await step();
    expect(db.state.pack.status).toBe('review');
    expect(db.state.pack.error).toContain('boom');
    expect(blitz()[0]).toMatchObject({ projectId: null, held: true, error: 'boom' });

    db.state.projects = [];
    await startGenerating('pp');
    await step();
    expect(render.renderBlitz).toHaveBeenCalledTimes(2);
    expect(blitz()[0]).toMatchObject({ projectId: 'new_a' });
  });

  it('after back to review, renders only a video whose card was edited', async () => {
    db.state.cards = { a: { hook: 'A' }, c: { hook: 'C' } };
    db.state.pack.status = 'ready';
    db.state.pack.blitz = [{ ideaId: 'a', projectId: 'old_a' }, { ideaId: 'c', projectId: 'old_c' }];
    await reopenReview('pp');
    expect(db.state.pack.status).toBe('review');

    db.state.cards.a = { hook: 'A edited' };
    await startGenerating('pp');
    db.state.projects = [{ id: 'old_c', renderStatus: 'COMPLETED', renderError: null }, { id: 'new_a', renderStatus: 'COMPLETED', renderError: null }];
    await step();
    expect(render.renderBlitz.mock.calls[0]![3].map((i: { id: string }) => i.id)).toEqual(['a']);
    expect(blitz().map((b) => b.projectId)).toEqual(['new_a', 'old_c']);
  });
});
