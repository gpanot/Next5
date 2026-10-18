// "Get my posts": the pack's workspace moves to the signed-in user once, only when ready, within the workspace limit.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = { pack: null as null | Record<string, unknown>, owned: 0, owner: 'placeholder' };
  const prisma = {
    prospectPack: {
      findUnique: vi.fn(async () => state.pack),
      updateMany: vi.fn(async ({ where, data }: { where: { status: string }; data: Record<string, unknown> }) => {
        if (state.pack?.status !== where.status) return { count: 0 };
        Object.assign(state.pack, data);
        return { count: 1 };
      }),
    },
    workspace: {
      count: vi.fn(async () => state.owned),
      update: vi.fn(async ({ data }: { data: { ownerUserId: string } }) => void (state.owner = data.ownerUserId)),
    },
    $transaction: vi.fn(async (work: (tx: unknown) => Promise<void>) => work(prisma)),
  };
  return { state, prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));

import { claimProspect } from '../../../src/server/prospects/claim';

beforeEach(() => {
  db.state.pack = { id: 'pp_1', workspaceId: 'ws_1', status: 'ready', claimedByUserId: null };
  db.state.owned = 0;
  db.state.owner = 'placeholder';
});

describe('claimProspect', () => {
  it('moves the workspace to the user and marks the pack claimed', async () => {
    await expect(claimProspect('tok', 'user_1')).resolves.toBe('ws_1');
    expect(db.state.owner).toBe('user_1');
    expect(db.state.pack).toMatchObject({ status: 'claimed', claimedByUserId: 'user_1' });
  });

  it('answers the same workspace to the user who claimed it, and refuses anyone else', async () => {
    await claimProspect('tok', 'user_1');
    await expect(claimProspect('tok', 'user_1')).resolves.toBe('ws_1');
    await expect(claimProspect('tok', 'user_2')).rejects.toMatchObject({ code: 'already_claimed' });
    expect(db.state.owner).toBe('user_1');
  });

  it('refuses a pack that is not ready, a wrong link and a full account', async () => {
    db.state.pack!.status = 'making';
    await expect(claimProspect('tok', 'user_1')).rejects.toMatchObject({ code: 'not_ready' });
    db.state.pack!.status = 'ready';
    db.state.owned = 10;
    await expect(claimProspect('tok', 'user_1')).rejects.toMatchObject({ code: 'too_many_workspaces' });
    db.state.pack = null;
    await expect(claimProspect('tok', 'user_1')).rejects.toMatchObject({ code: 'not_found' });
    expect(db.state.owner).toBe('placeholder');
  });
});
