// A Prospect Pack moves on step by step: the face check releases the held run, then the pack is ready only once the
// Brand Cast run, the Hooks Volume campaign and the Blitz renders have all settled.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = {
    pack: {} as Record<string, unknown>,
    runStatus: 'HELD',
    faces: 1,
    shows: { run_brand: ['c1', 'c2', 'c3'], run_hooks: ['h1', 'h2', 'h3', 'h4'] } as Record<string, string[]>,
    renders: [] as Array<{ id: string; renderStatus: string }>,
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
      findUnique: vi.fn(async () => ({ status: state.runStatus, finishedAt: new Date(), error: null })),
    },
    autoSlideshow: {
      count: vi.fn(async ({ where }: { where: { runId: string } }) => (state.shows[where.runId] ?? []).length),
      findMany: vi.fn(async ({ where }: { where: { runId: string } }) => (state.shows[where.runId] ?? []).map((id) => ({ id }))),
    },
    blitzProject: { findMany: vi.fn(async () => state.renders.filter((r) => r.renderStatus === 'COMPLETED')) },
    workspace: { findUniqueOrThrow: vi.fn(async () => ({ ideaTzOffsetMin: 0 })) },
    user: { findUniqueOrThrow: vi.fn(async () => ({ email: 'p@prospects.next5.invalid' })) },
  };
  return { state, prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));
const runAutoPipeline = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../../../src/server/autoSlideshow/pipeline', () => ({ runAutoPipeline }));
vi.mock('../../../src/server/prospects/hooksVolume', () => ({ buildHooksVolume: vi.fn(async () => 4) }));
vi.mock('../../../src/server/prospects/blitz', () => ({
  blitzReady: vi.fn(async () => [{ id: 'idea_1' }, { id: 'idea_2' }]),
  renderBlitz: vi.fn(async () => [{ ideaId: 'idea_1', projectId: 'bp_1' }, { ideaId: 'idea_2', projectId: 'bp_2' }]),
  blitzRenders: vi.fn(async () => ({ done: db.state.renders.filter((r) => r.renderStatus === 'COMPLETED').length, settled: db.state.renders.every((r) => r.renderStatus === 'COMPLETED' || r.renderStatus === 'FAILED') })),
}));

import { advanceProspect, approveFaces } from '../../../src/server/prospects/advance';

beforeEach(() => {
  db.state.pack = { id: 'pp_1', workspaceId: 'ws_1', ownerUserId: 'u_p', name: 'Acme', status: 'faces', brandRunId: 'run_brand', hooksRunId: 'run_hooks', hooksStartedAt: new Date(), blitz: [], error: null };
  db.state.runStatus = 'HELD';
  db.state.faces = 1;
  db.state.renders = [{ id: 'bp_1', renderStatus: 'PROCESSING' }, { id: 'bp_2', renderStatus: 'COMPLETED' }];
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

  it('fails a pack whose site could not be read', async () => {
    db.state.pack.status = 'building';
    db.state.runStatus = 'FAILED';
    await advanceProspect('pp_1');
    expect(db.state.pack.status).toBe('failed');
  });
});
