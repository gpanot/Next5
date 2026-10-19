// At most PROSPECT_MAX_ACTIVE packs are made at once: a new pack past that waits as 'queued', and a queued pack starts,
// oldest first, once a slot is free.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROSPECT_MAX_ACTIVE } from '../../../src/types/admin/prospects';

type Row = { id: string; status: string; createdAt: Date; ownerUserId: string; brandRunId: string; startedAt?: Date | null };

const db = vi.hoisted(() => {
  const state = { packs: [] as Row[] };
  const matches = (row: Row, where: { id?: string; status?: string | { in: string[] } }) =>
    (!where.id || row.id === where.id) && (typeof where.status === 'string' ? row.status === where.status : !where.status || where.status.in.includes(row.status));
  const prisma = {
    prospectPack: {
      count: vi.fn(async ({ where }: { where: Parameters<typeof matches>[1] }) => state.packs.filter((r) => matches(r, where)).length),
      findMany: vi.fn(async ({ where, take }: { where: Parameters<typeof matches>[1]; take: number }) =>
        state.packs.filter((r) => matches(r, where)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(0, take)),
      updateMany: vi.fn(async ({ where, data }: { where: Parameters<typeof matches>[1]; data: Partial<Row> }) => {
        const rows = state.packs.filter((r) => matches(r, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      }),
    },
  };
  return { state, prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));
const runAutoPipeline = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../../../src/server/autoSlideshow/pipeline', () => ({ runAutoPipeline }));

import { canStartNow, startIfTurn } from '../../../src/server/prospects/queue';

const pack = (id: string, status: string, minute: number): Row => ({ id, status, createdAt: new Date(Date.UTC(2026, 9, 19, 9, minute)), ownerUserId: `u_${id}`, brandRunId: `run_${id}` });
const busy = (n: number) => Array.from({ length: n }, (_, i) => pack(`busy_${i}`, i % 2 ? 'making' : 'building', i));

beforeEach(() => {
  db.state.packs = [];
  runAutoPipeline.mockClear();
});

describe('Prospect queue', () => {
  it('starts a new pack while there is room, and not past the limit', async () => {
    db.state.packs = busy(PROSPECT_MAX_ACTIVE - 1);
    expect(await canStartNow()).toBe(true);
    db.state.packs = busy(PROSPECT_MAX_ACTIVE);
    expect(await canStartNow()).toBe(false);
  });

  it('does not count packs waiting for the face check', async () => {
    db.state.packs = [...busy(PROSPECT_MAX_ACTIVE - 1), pack('f', 'faces', 30)];
    expect(await canStartNow()).toBe(true);
  });

  it('queues a new pack behind packs already waiting, even with room', async () => {
    db.state.packs = [pack('q', 'queued', 1)];
    expect(await canStartNow()).toBe(false);
  });

  it('starts the oldest queued pack when a slot frees, and keeps the newer one waiting', async () => {
    const older = pack('old', 'queued', 40);
    const newer = pack('new', 'queued', 50);
    db.state.packs = [...busy(PROSPECT_MAX_ACTIVE - 1), newer, older];
    expect(await startIfTurn(newer as never)).toBeNull();
    const job = await startIfTurn(older as never);
    expect(older.status).toBe('building');
    expect(older.startedAt).toBeInstanceOf(Date);
    await job?.();
    expect(runAutoPipeline).toHaveBeenCalledWith('run_old', 1);
    expect(await startIfTurn(newer as never)).toBeNull();
  });
});
