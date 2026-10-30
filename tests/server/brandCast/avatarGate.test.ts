/**
 * The brand avatar gate: the first run parks itself before step 4 until the owner picks a candidate, and the pick
 * keeps that one, deletes the others and releases the run. No DB, no image model.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  autoSlideshowRun: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  workspace: { findUnique: vi.fn(), update: vi.fn() },
  brandCastMember: { findMany: vi.fn(), deleteMany: vi.fn() },
};
vi.mock('../../../src/lib/db', () => ({ prisma: db }));
const prepareCast = vi.fn();
vi.mock('../../../src/server/brandCast/cast', () => ({ prepareCast: (...args: unknown[]) => prepareCast(...args) }));
const dropFiles = vi.fn();
vi.mock('../../../src/server/brandCast/archive', () => ({ dropFiles: (...args: unknown[]) => dropFiles(...args) }));
const requireSlideshowWorkspace = vi.fn();
vi.mock('../../../src/server/autoSlideshow/workspaces', () => ({ requireSlideshowWorkspace: (...args: unknown[]) => requireSlideshowWorkspace(...args) }));

const { castWaitsForAvatar, confirmAvatar, holdForAvatar } = await import('../../../src/server/brandCast/gate');

const ready = { id: 'm1', status: 'ready', imageKey: 'k1', imageUrl: null };

describe('holdForAvatar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.autoSlideshowRun.findUnique.mockResolvedValue({ waitForTarget: true, workspaceId: 'w1' });
    db.autoSlideshowRun.findUniqueOrThrow.mockResolvedValue({ stepCosts: {} });
  });

  it('does not park a run that does not wait', async () => {
    db.autoSlideshowRun.findUnique.mockResolvedValue({ waitForTarget: false, workspaceId: 'w1' });
    expect(await holdForAvatar('r1')).toBe(false);
    expect(prepareCast).not.toHaveBeenCalled();
  });

  it('does not park once the owner picked', async () => {
    db.workspace.findUnique.mockResolvedValue({ avatarConfirmedAt: new Date() });
    expect(await holdForAvatar('r1')).toBe(false);
  });

  it('parks the run, then makes the first candidate', async () => {
    db.workspace.findUnique.mockResolvedValue({ avatarConfirmedAt: null });
    db.autoSlideshowRun.updateMany.mockResolvedValue({ count: 1 });
    expect(await holdForAvatar('r1')).toBe(true);
    expect(db.autoSlideshowRun.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: { in: ['STEP_3_RUNNING', 'STEP_4_RUNNING'] } },
      data: { status: 'WAITING_AVATAR' },
    });
    expect(prepareCast).toHaveBeenCalledWith('w1', expect.anything());
  });

  it('goes on itself when the pick landed while the photo was made and did not take the run', async () => {
    db.workspace.findUnique.mockResolvedValueOnce({ avatarConfirmedAt: null }).mockResolvedValueOnce({ avatarConfirmedAt: new Date() });
    db.autoSlideshowRun.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    expect(await holdForAvatar('r1')).toBe(false);
  });
});

describe('castWaitsForAvatar', () => {
  beforeEach(() => vi.resetAllMocks());

  it('is true while a first run has no picked avatar', async () => {
    db.autoSlideshowRun.findUnique.mockResolvedValue({ waitForTarget: true, workspaceId: 'w1' });
    db.workspace.findUnique.mockResolvedValue({ avatarConfirmedAt: null });
    expect(await castWaitsForAvatar('r1')).toBe(true);
  });

  it('is false for a later run', async () => {
    db.autoSlideshowRun.findUnique.mockResolvedValue({ waitForTarget: false, workspaceId: 'w1' });
    expect(await castWaitsForAvatar('r1')).toBe(false);
  });
});

describe('confirmAvatar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSlideshowWorkspace.mockResolvedValue({ id: 'w1', avatarConfirmedAt: null });
    db.autoSlideshowRun.findMany.mockResolvedValue([{ id: 'r1' }]);
    db.autoSlideshowRun.updateMany.mockResolvedValue({ count: 1 });
  });

  it('keeps the pick, deletes the other candidates and releases the run', async () => {
    const other = { id: 'm2', status: 'ready', imageKey: 'k2' };
    db.brandCastMember.findMany.mockResolvedValue([ready, other]);
    expect(await confirmAvatar('u1', 'w1', 'm1')).toEqual({ released: ['r1'] });
    expect(db.brandCastMember.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['m2'] } } });
    expect(dropFiles).toHaveBeenCalledWith([other]);
    expect(db.workspace.update).toHaveBeenCalledWith({ where: { id: 'w1' }, data: { avatarConfirmedAt: expect.any(Date) } });
    // The countdown starts when the work does, not when the run was created.
    expect(db.autoSlideshowRun.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'WAITING_AVATAR' },
      data: { status: 'STEP_4_RUNNING', startedAt: expect.any(Date) },
    });
  });

  it('refuses a candidate whose photo is not in yet', async () => {
    db.brandCastMember.findMany.mockResolvedValue([{ id: 'm1', status: 'pending', imageKey: null }]);
    await expect(confirmAvatar('u1', 'w1', 'm1')).rejects.toThrow(/not ready/i);
    expect(db.brandCastMember.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a candidate that is not the workspace’s', async () => {
    db.brandCastMember.findMany.mockResolvedValue([ready]);
    await expect(confirmAvatar('u1', 'w1', 'nope')).rejects.toThrow(/not one of yours/i);
  });
});
