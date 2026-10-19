// A Prospect Pack moves on step by step: the face check releases the held run, then the pack is ready only once the
// Brand Cast run, the Hooks Volume campaign and the Blitz renders have all settled. Posts past the free days are previews.
// Blitz ideas are picked as they finish, from the site scan on (no wait for the face check).

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = {
    pack: {} as Record<string, unknown>,
    runStatus: 'HELD',
    faces: 1,
    shows: { run_brand: ['c1', 'c2', 'c3'], run_hooks: ['h1', 'h2', 'h3', 'h4'] } as Record<string, string[]>,
    renders: [] as Array<{ id: string; renderStatus: string }>,
    covers: [] as number[],
    coverRows: [] as Array<{ id: string; slides: Array<{ imageKey: string | null }> }>,
  };
  const prisma = {
    prospectPack: {
      findUnique: vi.fn(async () => ({ ...state.pack })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(state.pack, data)),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (where.status && where.status !== state.pack.status) return { count: 0 };
        if ('blitz' in where && (state.pack.blitz as unknown[]).length > 0) return { count: 0 };
        if (where.OR && state.pack.hooksStartedAt) return { count: 0 };
        Object.assign(state.pack, data);
        return { count: 1 };
      }),
    },
    brandCastMember: { count: vi.fn(async () => state.faces) },
    autoSlideshowRun: {
      updateMany: vi.fn(async () => ({ count: state.runStatus === 'HELD' ? 1 : 0 })),
      findUnique: vi.fn(async () => ({ status: state.runStatus, finishedAt: new Date(), error: null, coverOnlyPositions: state.covers })),
    },
    autoSlideshow: {
      count: vi.fn(async ({ where }: { where: { runId: string } }) => (state.shows[where.runId] ?? []).length),
      findMany: vi.fn(async ({ where }: { where: { runId: string; position?: unknown } }) => (where.position ? state.coverRows : (state.shows[where.runId] ?? []).map((id) => ({ id })))),
    },
    blitzProject: { findMany: vi.fn(async () => state.renders.filter((r) => r.renderStatus === 'COMPLETED')) },
    workspace: { findUniqueOrThrow: vi.fn(async () => ({ ideaTzOffsetMin: 0 })) },
    user: { findUniqueOrThrow: vi.fn(async () => ({ email: 'p@prospects.next5.invalid' })) },
  };
  return { state, prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));
const runAutoPipeline = vi.hoisted(() => vi.fn(async () => undefined));
const blitzMock = vi.hoisted(() => ({
  ideas: [{ id: 'idea_1' }, { id: 'idea_2' }] as Array<{ id: string }>,
  rendered: [{ ideaId: 'idea_1', projectId: 'bp_1' }, { ideaId: 'idea_2', projectId: 'bp_2' }] as Array<Record<string, unknown>>,
}));
vi.mock('../../../src/server/autoSlideshow/pipeline', () => ({ runAutoPipeline }));
vi.mock('../../../src/server/prospects/hooksVolume', () => ({ buildHooksVolume: vi.fn(async () => 4) }));
vi.mock('../../../src/server/prospects/blitz', () => ({
  unpickedIdeas: vi.fn(async (_ws: string, picked: Set<string>) => ({ ideas: blitzMock.ideas.filter((i) => !picked.has(i.id)), writing: false })),
  blitzPicked: vi.fn(async () => true),
  renderBlitz: vi.fn(async (_u: string, _w: string, _n: string, ideas: Array<{ id: string }>) =>
    ideas.map((i) => blitzMock.rendered.find((r) => r.ideaId === i.id) ?? { ideaId: i.id, projectId: null, error: 'No stock photo for every shot yet.' })),
  blitzRenders: vi.fn(async () => ({ done: db.state.renders.filter((r) => r.renderStatus === 'COMPLETED').length, settled: db.state.renders.every((r) => r.renderStatus === 'COMPLETED' || r.renderStatus === 'FAILED') })),
}));

import { advanceProspect, approveFaces } from '../../../src/server/prospects/advance';

beforeEach(() => {
  db.state.pack = { id: 'pp_1', workspaceId: 'ws_1', ownerUserId: 'u_p', name: 'Acme', status: 'faces', brandRunId: 'run_brand', hooksRunId: 'run_hooks', hooksStartedAt: new Date(), blitz: [], error: null };
  db.state.runStatus = 'HELD';
  db.state.faces = 1;
  db.state.renders = [{ id: 'bp_1', renderStatus: 'PROCESSING' }, { id: 'bp_2', renderStatus: 'COMPLETED' }];
  db.state.covers = [];
  db.state.coverRows = [];
  blitzMock.ideas = [{ id: 'idea_1' }, { id: 'idea_2' }];
  blitzMock.rendered = [{ ideaId: 'idea_1', projectId: 'bp_1' }, { ideaId: 'idea_2', projectId: 'bp_2' }];
  runAutoPipeline.mockClear();
});

describe('approveFaces', () => {
  it('releases the held run from step 4', async () => {
    const job = await approveFaces('pp_1');
    expect(db.state.pack.status).toBe('making');
    await job();
    expect(runAutoPipeline).toHaveBeenCalledWith('run_brand', 4);
  });

  it('refuses with no face, and a pack not at the face check', async () => {
    db.state.faces = 0;
    await expect(approveFaces('pp_1')).rejects.toMatchObject({ code: 'no_faces' });
    db.state.faces = 1;
    db.state.pack.status = 'making';
    await expect(approveFaces('pp_1')).rejects.toMatchObject({ code: 'not_faces' });
  });
});

describe('advanceProspect', () => {
  it('waits while the Brand Cast run or a render is still going, then plans the days', async () => {
    db.state.pack.status = 'making';
    db.state.runStatus = 'STEP_5_RUNNING';
    await advanceProspect('pp_1');
    expect(db.state.pack.blitz).toEqual([{ ideaId: 'idea_1', projectId: 'bp_1' }, { ideaId: 'idea_2', projectId: 'bp_2' }]);
    expect(db.state.pack.status).toBe('making');

    db.state.runStatus = 'COMPLETED';
    await advanceProspect('pp_1');
    expect(db.state.pack.status).toBe('making');

    db.state.renders[0]!.renderStatus = 'FAILED';
    await advanceProspect('pp_1');
    expect(db.state.pack.status).toBe('ready');
    const days = db.state.pack.days as Array<{ kind: string; refId: string }>;
    expect(days).toHaveLength(8);
    expect(days.filter((d) => d.kind === 'blitz').map((d) => d.refId)).toEqual(['bp_2']);
  });

  it('marks the Blitz ideas and Brand Cast slideshows past the free days as previews', async () => {
    db.state.pack.status = 'making';
    db.state.runStatus = 'COMPLETED';
    db.state.renders = [{ id: 'bp_1', renderStatus: 'COMPLETED' }];
    db.state.shows.run_brand = ['c1', 'c2'];
    db.state.covers = [2];
    db.state.coverRows = [{ id: 'c3', slides: [{ imageKey: 'k0' }, { imageKey: null }] }];
    blitzMock.ideas = ['idea_1', 'idea_2', 'idea_3', 'idea_4', 'idea_5'].map((id) => ({ id }));
    blitzMock.rendered = [{ ideaId: 'idea_1', projectId: 'bp_1' }, { ideaId: 'idea_5', projectId: null, preview: true }];
    const { renderBlitz } = await import('../../../src/server/prospects/blitz');
    await advanceProspect('pp_1');
    expect(vi.mocked(renderBlitz).mock.calls.at(-1)?.[4]).toEqual(new Set(['idea_5']));
    expect(db.state.pack.status).toBe('ready');
    const days = db.state.pack.days as Array<{ day: number; refId: string; preview?: boolean }>;
    // One video rendered: the free days take full slideshows before the video preview.
    expect(days.filter((d) => d.preview).map((d) => ({ day: d.day, refId: d.refId }))).toEqual([{ day: 8, refId: 'idea_5' }, { day: 9, refId: 'c3' }]);
    db.state.shows.run_brand = ['c1', 'c2', 'c3'];
  });

  it('approves the faces on its own and starts the Brand Cast slideshows', async () => {
    await advanceProspect('pp_1');
    expect(db.state.pack.status).toBe('making');
    expect(runAutoPipeline).toHaveBeenCalledWith('run_brand', 4);
  });

  it('waits at the face check when no face could be made', async () => {
    db.state.faces = 0;
    await advanceProspect('pp_1');
    expect(db.state.pack.status).toBe('faces');
    expect(runAutoPipeline).not.toHaveBeenCalled();
  });

  it('renders Blitz ideas from the face check on as they finish, one batch at a time', async () => {
    const { renderBlitz } = await import('../../../src/server/prospects/blitz');
    blitzMock.ideas = [{ id: 'idea_1' }];
    await advanceProspect('pp_1');
    expect(db.state.pack.blitz).toEqual([{ ideaId: 'idea_1', projectId: 'bp_1' }]);

    blitzMock.ideas = [{ id: 'idea_1' }, { id: 'idea_2' }];
    await advanceProspect('pp_1');
    expect(vi.mocked(renderBlitz).mock.calls.at(-1)?.[3]).toEqual([{ id: 'idea_2' }]);
    expect(db.state.pack.blitz).toEqual([{ ideaId: 'idea_1', projectId: 'bp_1' }, { ideaId: 'idea_2', projectId: 'bp_2' }]);

    db.state.pack.blitz = [{ ideaId: 'idea_1', projectId: null }];
    const calls = vi.mocked(renderBlitz).mock.calls.length;
    await advanceProspect('pp_1');
    expect(vi.mocked(renderBlitz).mock.calls.length).toBe(calls);
  });

  it('fails a pack whose site could not be read', async () => {
    db.state.pack.status = 'building';
    db.state.runStatus = 'FAILED';
    await advanceProspect('pp_1');
    expect(db.state.pack.status).toBe('failed');
  });
});
