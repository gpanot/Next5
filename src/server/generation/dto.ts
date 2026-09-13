// server-only — never import from a 'use client' file.

import type { Batch, BatchItem } from '@prisma/client';
import { FREE_REDOS_PER_ITEM } from '../../config/business';
import { prisma } from '../../lib/db';
import type { BatchDetailDto, BatchItemDto, BatchSummaryDto } from '../../types/business/batches';
import { presignObject } from '../storage/objectStore';
import { getProgress } from './batchStatus';

export const toItemDto = async (item: BatchItem): Promise<BatchItemDto> => ({
  id: item.id,
  status: item.status,
  format: item.format,
  sceneId: item.sceneId,
  shot: item.shot,
  productId: item.productId,
  url: item.r2Key ? await presignObject(item.r2Key) : null,
  favorite: item.favorite,
  rating: item.rating,
  freeRedosLeft: Math.max(0, FREE_REDOS_PER_ITEM - item.freeRedosUsed),
  caption: item.caption,
  errorMessage: item.status === 'failed' ? item.errorMessage : null,
});

const coverFor = async (batchId: string): Promise<string | null> => {
  const first = await prisma.batchItem.findFirst({
    where: { batchId, status: 'ready', r2Key: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { r2Key: true },
  });
  return first?.r2Key ? presignObject(first.r2Key) : null;
};

export const toSummaryDto = async (batch: Batch): Promise<BatchSummaryDto> => ({
  id: batch.id,
  kind: batch.kind,
  status: batch.status,
  name: batch.name,
  formats: batch.formats,
  highRes: batch.highRes,
  setId: batch.setId,
  themeId: batch.themeId,
  packId: batch.packId,
  creditsReserved: batch.creditsReserved,
  createdAt: batch.createdAt.toISOString(),
  completedAt: batch.completedAt?.toISOString() ?? null,
  coverUrl: await coverFor(batch.id),
  progress: await getProgress(batch.id),
});

export const toDetailDto = async (batch: Batch): Promise<BatchDetailDto> => {
  const items = await prisma.batchItem.findMany({ where: { batchId: batch.id }, orderBy: { createdAt: 'asc' } });
  return { ...(await toSummaryDto(batch)), items: await Promise.all(items.map(toItemDto)) };
};
