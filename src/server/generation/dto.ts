// server-only — never import from a 'use client' file.

import type { Batch, BatchItem } from '@prisma/client';
import { FREE_REDOS_PER_ITEM } from '../../config/business';
import { nextShotsForProduct } from '../../config/shots';
import { prisma } from '../../lib/db';
import type { BatchDetailDto, BatchItemDto, BatchSummaryDto, PostKitDto, ScoreDetailsDto } from '../../types/business/batches';
import { presignObject } from '../storage/objectStore';
import { madeShotsByProduct } from '../shop/morePhotos';
import { getProgress } from './batchStatus';
import { canRetryFailed } from './redo';

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
  postKit: (item.postKit as PostKitDto | null) ?? null,
  score: item.score,
  scoreDetails: (item.scoreDetails as ScoreDetailsDto | null) ?? null,
  errorMessage: item.status === 'failed' ? item.errorMessage : null,
  canRetry: canRetryFailed(item),
  startedAt: item.status === 'submitting' || item.status === 'generating' ? item.submittedAt?.toISOString() ?? null : null,
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
  const productIds = [...new Set(items.map((i) => i.productId).filter((id): id is string => Boolean(id)))];
  const [products, workspace, made] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } } }),
    prisma.workspace.findUniqueOrThrow({ where: { id: batch.workspaceId }, select: { visibleAiTag: true } }),
    productIds.length > 0 ? madeShotsByProduct(batch.workspaceId, productIds) : Promise.resolve(new Map<string, string[]>()),
  ]);
  const productDtos = await Promise.all(
    productIds.map(async (id) => {
      const p = products.find((x) => x.id === id);
      const shots = made.get(id) ?? [];
      return {
        id, name: p?.name ?? 'Product', sku: p?.sku ?? null, category: p?.category ?? '', colorName: p?.colorName ?? null,
        frontUrl: p?.frontR2Key ? await presignObject(p.frontR2Key) : null,
        angleCount: shots.length,
        nextShots: p && !p.archivedAt ? nextShotsForProduct(p.category, Boolean(p.backR2Key), shots) : [],
      };
    }),
  );
  return { ...(await toSummaryDto(batch)), items: await Promise.all(items.map(toItemDto)), products: productDtos, visibleAiTag: workspace.visibleAiTag };
};
