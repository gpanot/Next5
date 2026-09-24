/**
 * Unit tests for the studio cron recovery tick.
 * Prisma is mocked — no real DB connection needed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted — do NOT reference const/let from the outer scope here.
// Instead use vi.hoisted() to create mocks that are available in the factory.
const { mockUpdateMany } = vi.hoisted(() => ({ mockUpdateMany: vi.fn() }));

vi.mock('../../../src/lib/db', () => ({
  prisma: {
    studioRun: {
      updateMany: mockUpdateMany,
    },
  },
}));

import { recoverStuckStudioJobs } from '../../../src/server/studio/studioTick';

const STUCK_THRESHOLD_MS = 3 * 60 * 1_000; // must match studioTick.ts

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateMany.mockResolvedValue({ count: 0 });
});

describe('recoverStuckStudioJobs', () => {
  it('calls updateMany for each of the 3 job types', async () => {
    await recoverStuckStudioJobs();
    expect(mockUpdateMany).toHaveBeenCalledTimes(3);
  });

  it('marks only "running" jobs older than STUCK_THRESHOLD_MS', async () => {
    await recoverStuckStudioJobs();

    type UMCall = { where: Record<string, unknown> };
    const calls = mockUpdateMany.mock.calls as unknown as Array<[UMCall]>;
    for (const [args] of calls) {
      const where = args.where;
      const statusField = Object.keys(where).find(k => k.endsWith('Status'));
      expect(statusField).toBeDefined();
      expect(where[statusField!]).toBe('running');

      const updatedAt = where.updatedAt as { lt: Date };
      expect(updatedAt.lt).toBeInstanceOf(Date);
      expect(Date.now() - updatedAt.lt.getTime()).toBeGreaterThanOrEqual(STUCK_THRESHOLD_MS);
    }
  });

  it('marks extract stuck jobs as failed with an error message', async () => {
    await recoverStuckStudioJobs();

    // mock.calls is any[][] — cast via unknown for flexibility
    type UMCall = { where: Record<string, unknown>; data: Record<string, unknown> };
    const calls = mockUpdateMany.mock.calls as unknown as Array<[UMCall]>;
    const extractCall = calls.find(([a]) => 'extractStatus' in a.where);
    expect(extractCall).toBeDefined();
    const { data } = extractCall![0];
    expect(data.extractStatus).toBe('failed');
    expect(typeof data.extractError).toBe('string');
    expect((data.extractError as string).toLowerCase()).toMatch(/timed? ?out|stuck|exceeded/i);
  });

  it('marks research stuck jobs as failed with an error message', async () => {
    await recoverStuckStudioJobs();

    type UMCall = { where: Record<string, unknown>; data: Record<string, unknown> };
    const calls = mockUpdateMany.mock.calls as unknown as Array<[UMCall]>;
    const researchCall = calls.find(([a]) => 'researchStatus' in a.where);
    expect(researchCall).toBeDefined();
    const { data } = researchCall![0];
    expect(data.researchStatus).toBe('failed');
    expect(typeof data.researchError).toBe('string');
  });

  it('marks generate stuck jobs as failed with an error message', async () => {
    await recoverStuckStudioJobs();

    type UMCall = { where: Record<string, unknown>; data: Record<string, unknown> };
    const calls = mockUpdateMany.mock.calls as unknown as Array<[UMCall]>;
    const generateCall = calls.find(([a]) => 'generateStatus' in a.where);
    expect(generateCall).toBeDefined();
    const { data } = generateCall![0];
    expect(data.generateStatus).toBe('failed');
    expect(typeof data.generateError).toBe('string');
  });

  it('handles updateMany returning count=0 gracefully (no stuck jobs)', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    await expect(recoverStuckStudioJobs()).resolves.toBeUndefined();
  });

  it('propagates updateMany errors', async () => {
    mockUpdateMany.mockRejectedValue(new Error('db down'));
    await expect(recoverStuckStudioJobs()).rejects.toThrow('db down');
  });
});
