// server-only — never import from a 'use client' file.

import { Prisma, type Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';

/** The /app studios. 'slideshow' workspaces (Auto Slideshow, many per user) are never one of them. */
export type StudioProduct = 'brand' | 'shop';
export type StudioWorkspace = Workspace & { product: StudioProduct };
export const STUDIO_PRODUCTS: StudioProduct[] = ['brand', 'shop'];
/** Prisma filter: Brand and Shop studios only. */
export const studioWhere = { product: { in: STUDIO_PRODUCTS } } as const;

export type CreateWorkspaceInput = {
  ownerUserId: string;
  product: StudioProduct;
  name: string;
  industry?: string | null;
  handle?: string | null;
};

const findStudio = (ownerUserId: string, product: StudioProduct) =>
  prisma.workspace.findFirst({ where: { ownerUserId, product } }) as Promise<StudioWorkspace | null>;

/**
 * Creates the workspace, or returns the existing one for this user + product (v1: one each). A partial unique index
 * keeps it to one: when two requests race, the loser reads the winner's row.
 */
export const createWorkspace = async (input: CreateWorkspaceInput): Promise<StudioWorkspace> => {
  const existing = await findStudio(input.ownerUserId, input.product);
  if (existing) return existing;
  try {
    return (await prisma.workspace.create({
      data: {
        ownerUserId: input.ownerUserId,
        product: input.product,
        name: input.name,
        industry: input.industry ?? null,
        handle: input.handle ?? null,
        visibleAiTag: input.product === 'shop',
        defaultFormats: input.product === 'shop' ? ['square_1_1'] : ['portrait_4_5'],
      },
    })) as StudioWorkspace;
  } catch (err) {
    const raced = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' ? await findStudio(input.ownerUserId, input.product) : null;
    if (raced) return raced;
    throw err;
  }
};

/** The user's workspace for a product, or their oldest workspace when no product is given. */
export const getWorkspaceForUser = async (
  userId: string,
  product?: StudioProduct,
): Promise<StudioWorkspace | null> => {
  if (product) return findStudio(userId, product);
  return prisma.workspace.findFirst({ where: { ownerUserId: userId, ...studioWhere }, orderBy: { createdAt: 'asc' } }) as Promise<StudioWorkspace | null>;
};

export const requireWorkspace = async (userId: string, product?: StudioProduct): Promise<StudioWorkspace> => {
  const workspace = await getWorkspaceForUser(userId, product);
  if (!workspace) throw new HttpError(404, 'workspace_not_found', 'Set up your workspace first.');
  return workspace;
};

export const isProductLine = (value: unknown): value is StudioProduct => value === 'brand' || value === 'shop';
