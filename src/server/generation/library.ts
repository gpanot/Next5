// server-only — never import from a 'use client' file.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';

export type LibraryFilters = {
  workspaceId: string;
  setId?: string | null;
  themeId?: string | null;
  productId?: string | null;
  format?: string | null;
  favorite?: boolean;
  cursor?: string | null;
  take?: number;
};

export const libraryWhere = (f: LibraryFilters): Prisma.BatchItemWhereInput => ({
  status: 'ready',
  r2Key: { not: null },
  batch: { workspaceId: f.workspaceId, ...(f.setId ? { setId: f.setId } : {}), ...(f.themeId ? { themeId: f.themeId } : {}) },
  ...(f.productId ? { productId: f.productId } : {}),
  ...(f.format ? { format: f.format } : {}),
  ...(f.favorite ? { favorite: true } : {}),
});

/** Ready photos, newest first, with cursor pagination. */
export const listLibrary = async (f: LibraryFilters) => {
  const take = Math.min(60, f.take ?? 40);
  const items = await prisma.batchItem.findMany({
    where: libraryWhere(f),
    orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(f.cursor ? { cursor: { id: f.cursor }, skip: 1 } : {}),
    include: { batch: { select: { id: true, name: true } } },
  });
  const page = items.slice(0, take);
  return { items: page, nextCursor: items.length > take ? page[page.length - 1]?.id ?? null : null };
};
