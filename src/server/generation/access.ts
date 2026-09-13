// server-only — never import from a 'use client' file.

import type { Batch, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { isProductLine, requireWorkspace } from '../workspaces/workspaces';

/** The caller's workspace for a request (`?product=` or body `product`), else their first workspace. */
export const workspaceFromRequest = async (userId: string, product: unknown): Promise<Workspace> =>
  requireWorkspace(userId, isProductLine(product) ? product : undefined);

/** Loads a batch only if it belongs to one of the user's workspaces (404 otherwise — never 403). */
export const requireOwnedBatch = async (userId: string, batchId: string): Promise<Batch> => {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, workspace: { ownerUserId: userId } } });
  if (!batch) throw new HttpError(404, 'batch_not_found', 'Batch not found.');
  return batch;
};
