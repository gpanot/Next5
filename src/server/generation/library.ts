// server-only — never import from a 'use client' file.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { OFF_CALENDAR } from '../calendar/calendar';

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
  archivedAt: null,
  batch: { workspaceId: f.workspaceId, preview: false, variation: false, ...(f.setId ? { setId: f.setId } : {}), ...(f.themeId ? { themeId: f.themeId } : {}) },
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

export type SeriesFilter = 'all' | 'property' | 'theme';

const seriesCategoryWhere = (filter: SeriesFilter): Prisma.BatchWhereInput =>
  filter === 'property' ? { listingId: { not: null } } : filter === 'theme' ? { listingId: null, kind: 'brand_theme' } : {};

/** Her series (one per batch with photos she kept), newest first, with what each was made for. */
export const listSeries = async (workspaceId: string, filter: SeriesFilter, cursor: string | null, take = 24) => {
  const batches = await prisma.batch.findMany({
    where: { workspaceId, preview: false, variation: false, ...seriesCategoryWhere(filter), items: { some: { status: 'ready', r2Key: { not: null }, archivedAt: null } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      listing: { select: { label: true, source: true } },
      theme: { select: { title: true } },
      items: { where: { status: 'ready', r2Key: { not: null }, archivedAt: null }, orderBy: { createdAt: 'asc' }, select: { r2Key: true, _count: { select: { slots: { where: { status: { notIn: OFF_CALENDAR } } } } } } },
    },
  });
  const page = batches.slice(0, take);
  return { batches: page, nextCursor: batches.length > take ? page[page.length - 1]?.id ?? null : null };
};
