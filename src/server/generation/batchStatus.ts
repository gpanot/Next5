// server-only — never import from a 'use client' file.

import type { BatchStatus } from '@prisma/client';
import { prisma } from '../../lib/db';
import { sendOnceQuietly } from '../email/send';
import { batchReadyEmail } from '../email/templates';

export type BatchProgress = { total: number; ready: number; failed: number; inFlight: number };

export const getProgress = async (batchId: string): Promise<BatchProgress> => {
  const groups = await prisma.batchItem.groupBy({ by: ['status'], where: { batchId }, _count: { _all: true } });
  const count = (status: string) => groups.find((g) => g.status === status)?._count._all ?? 0;
  const ready = count('ready');
  const failed = count('failed');
  const inFlight = count('queued') + count('submitting') + count('generating');
  return { total: ready + failed + inFlight, ready, failed, inFlight };
};

const statusFor = (p: BatchProgress, current: BatchStatus): BatchStatus => {
  if (current === 'cancelled') return current;
  if (p.inFlight > 0) return p.ready + p.failed > 0 || current === 'generating' ? 'generating' : 'queued';
  return p.ready > 0 ? 'ready' : 'failed';
};

/** Recomputes a batch's status from its items; sets/clears completedAt. Returns the new status. */
export const recomputeBatchStatus = async (batchId: string, now = new Date()): Promise<BatchStatus> => {
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { status: true, completedAt: true, createdAt: true, name: true, workspaceId: true, workspace: { select: { ownerUserId: true } } } });
  if (!batch) return 'failed';
  const progress = await getProgress(batchId);
  const status = statusFor(progress, batch.status);
  const terminal = status === 'ready' || status === 'failed';
  const completedAt = terminal ? batch.completedAt ?? now : null;
  if (status !== batch.status || completedAt?.getTime() !== batch.completedAt?.getTime()) {
    await prisma.batch.update({ where: { id: batchId }, data: { status, completedAt } });
    const tookLong = now.getTime() - batch.createdAt.getTime() > 3 * 60 * 1000;
    if (status === 'ready' && batch.status !== 'ready' && tookLong) {
      sendOnceQuietly({ userId: batch.workspace.ownerUserId, workspaceId: batch.workspaceId, template: 'batch_ready', dedupeKey: `batch-ready:${batchId}:${completedAt?.getTime() ?? 0}`, content: batchReadyEmail(batch.name, progress.ready, batchId) });
    }
  }
  return status;
};
