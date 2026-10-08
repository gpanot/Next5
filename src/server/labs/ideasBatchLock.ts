// server-only — never import from a 'use client' file.
// One batch of calendar ideas at a time per workspace: Workspace.ideasBatchAt is the lock (stale after LOCK_STALE_MS,
// a job that died). The server writes the first batch when the first run is done; a browser asking at the same time
// waits for that batch instead of writing a second one.

import { prisma } from '../../lib/db';

/** A batch takes 1-4 minutes (the routes' maxDuration is 300 s): older than this, its job died. */
export const LOCK_STALE_MS = 5 * 60_000;
const WAIT_POLL_MS = 3_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Takes the workspace's batch lock. False when another batch is being written. */
export async function claimIdeasBatch(workspaceId: string): Promise<boolean> {
  const { count } = await prisma.workspace.updateMany({
    where: { id: workspaceId, OR: [{ ideasBatchAt: null }, { ideasBatchAt: { lt: new Date(Date.now() - LOCK_STALE_MS) } }] },
    data: { ideasBatchAt: new Date() },
  });
  return count === 1;
}

export const releaseIdeasBatch = (workspaceId: string) =>
  prisma.workspace.update({ where: { id: workspaceId }, data: { ideasBatchAt: null } }).catch((err: unknown) => console.error('[calendar-ideas] lock release failed:', err));

/** When the batch being written started; null when none is (or its lock is stale). */
export const ideasBatchSince = (at: Date | null | undefined): string | null =>
  at && at.getTime() > Date.now() - LOCK_STALE_MS ? at.toISOString() : null;

/** Waits until the workspace's batch is written (or its lock goes stale, or `maxMs`). */
export async function waitForIdeasBatch(workspaceId: string, maxMs: number): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ideasBatchAt: true } });
    if (!ideasBatchSince(ws?.ideasBatchAt)) return;
    await sleep(WAIT_POLL_MS);
  }
}
