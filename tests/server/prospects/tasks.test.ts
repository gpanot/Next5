// The progress panel shows where a pack stopped: the failed step with its error, later steps skipped, and Blitz ideas
// that are retrying or failed for good.

import { describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const pack = {
    id: 'pp_1', workspaceId: 'ws_1', status: 'making', createdAt: new Date(), approvedAt: new Date(), hooksStartedAt: null, error: null,
    brandRunId: 'run_brand', hooksRunId: null,
    blitz: [{ ideaId: 'i1', projectId: null, error: 'Pexels busy', retry: true, tries: 1 }, { ideaId: 'i2', projectId: null, error: 'No photos', tries: 3 }, { ideaId: 'i3', projectId: 'bp_3' }],
  };
  const prisma = {
    prospectPack: { findUnique: vi.fn(async () => pack), count: vi.fn(async () => 0) },
    brandCastMember: { count: vi.fn(async () => 3) },
    autoSlideshowRun: { findUnique: vi.fn(async () => ({ status: 'FAILED', failedStep: 5, error: 'Photo model down', stepTimings: { 1: 8000 }, finishedAt: null, coverOnlyPositions: [] })) },
    autoSlideshow: { findMany: vi.fn(async () => [{ position: 0, topic: 'Slow replies', status: 'written', error: null, slides: [] }]) },
    blitzProject: { findMany: vi.fn(async () => [{ id: 'bp_3', renderStatus: 'PENDING', createdAt: new Date(), renderStartedAt: null, renderFinishedAt: null }]), count: vi.fn(async () => 4) },
  };
  return { prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));

import { packTasks } from '../../../src/server/prospects/tasks';

describe('Prospect tasks', () => {
  it('shows the failed step, skips the later ones, and reports each Blitz idea', async () => {
    const { groups } = await packTasks('pp_1');
    const [, cast, , videos] = groups;
    expect(cast.tasks.map((t) => t.state)).toEqual(['done', 'failed', 'skipped', 'failed']);
    expect(cast.tasks[1].detail).toBe('Photo model down');
    expect(videos.tasks.map((t) => t.state)).toEqual(['running', 'failed', 'waiting']);
    expect(videos.tasks[0].detail).toContain('Try 2/3');
    expect(videos.tasks[2].detail).toBe('In the render line: 5');
  });
});
