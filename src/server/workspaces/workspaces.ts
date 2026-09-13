// server-only — never import from a 'use client' file.

import type { ProductLine, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';

export type CreateWorkspaceInput = {
  ownerUserId: string;
  product: ProductLine;
  name: string;
  industry?: string | null;
  handle?: string | null;
};

/** Creates the workspace, or returns the existing one for this user + product (v1: one each). */
export const createWorkspace = async (input: CreateWorkspaceInput): Promise<Workspace> =>
  prisma.workspace.upsert({
    where: { ownerUserId_product: { ownerUserId: input.ownerUserId, product: input.product } },
    update: {},
    create: {
      ownerUserId: input.ownerUserId,
      product: input.product,
      name: input.name,
      industry: input.industry ?? null,
      handle: input.handle ?? null,
      visibleAiTag: input.product === 'shop',
      defaultFormats: input.product === 'shop' ? ['square_1_1'] : ['portrait_4_5'],
    },
  });

/** The user's workspace for a product, or their oldest workspace when no product is given. */
export const getWorkspaceForUser = async (
  userId: string,
  product?: ProductLine,
): Promise<Workspace | null> => {
  if (product) {
    return prisma.workspace.findUnique({
      where: { ownerUserId_product: { ownerUserId: userId, product } },
    });
  }
  return prisma.workspace.findFirst({ where: { ownerUserId: userId }, orderBy: { createdAt: 'asc' } });
};

export const requireWorkspace = async (userId: string, product?: ProductLine): Promise<Workspace> => {
  const workspace = await getWorkspaceForUser(userId, product);
  if (!workspace) throw new HttpError(404, 'workspace_not_found', 'Set up your workspace first.');
  return workspace;
};

export const isProductLine = (value: unknown): value is ProductLine => value === 'brand' || value === 'shop';
