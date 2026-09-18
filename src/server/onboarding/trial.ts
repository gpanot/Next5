// server-only — never import from a 'use client' file.

import type { Batch, Workspace } from '@prisma/client';
import { TRIAL_CREDITS } from '../../config/business';
import type { ThemeScene } from '../../content/business/catalog/types';
import { prisma } from '../../lib/db';
import { grant } from '../credits/ledger';
import { withSerializable } from '../db/transaction';
import { createBatch } from '../generation/createBatch';
import { HttpError } from '../http';

const featuredThemeId = async (): Promise<string> => {
  const month = new Date().toISOString().slice(0, 7);
  const themes = await prisma.theme.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const dated = themes.filter((t) => t.featuredMonth).sort((a, b) => (a.featuredMonth ?? '').localeCompare(b.featuredMonth ?? ''));
  const theme = dated.find((t) => (t.featuredMonth ?? '') >= month) ?? themes[0];
  if (!theme) throw new HttpError(500, 'no_theme', 'No themes are available.');
  return theme.id;
};

/** Grants the free trial (once per workspace, one retry if everything failed) and starts a 3-photo batch. */
export const startTrial = async (workspace: Workspace, options: { productId?: string | null } = {}): Promise<Batch> => {
  const previous = await prisma.batch.findFirst({ where: { workspaceId: workspace.id, kind: 'trial' }, orderBy: { createdAt: 'desc' } });
  const isRetry = previous?.status === 'failed';
  if (workspace.trialUsedAt && !isRetry) throw new HttpError(409, 'trial_used', 'Your free photos have already been created.');
  const retries = await prisma.batch.count({ where: { workspaceId: workspace.id, kind: 'trial' } });
  if (retries >= 2) throw new HttpError(409, 'trial_used', 'Your free photos have already been created.');

  const set = await prisma.studioSet.findFirst({ where: { workspaceId: workspace.id, status: { not: 'archived' } }, orderBy: { createdAt: 'desc' } });
  if (!set) throw new HttpError(409, 'set_required', 'Pick a style first.');

  await withSerializable((tx) =>
    grant(tx, { workspaceId: workspace.id, bucket: 'trial', amount: TRIAL_CREDITS, reason: 'trial_grant', refType: 'trial', refId: `${workspace.id}:${retries}`, expiresAt: null }),
  );

  let batch: Batch;
  if (workspace.product === 'brand') {
    const themeId = await featuredThemeId();
    const theme = await prisma.theme.findUniqueOrThrow({ where: { id: themeId } });
    const sceneIds = (theme.scenes as unknown as ThemeScene[]).slice(0, TRIAL_CREDITS).map((s) => s.id);
    batch = await createBatch(workspace, { kind: 'brand_theme', trial: true, setId: set.id, themeId, count: TRIAL_CREDITS, sceneIds, formats: ['portrait_4_5'], highRes: false });
  } else {
    // The product the seller picked, else their best-selling product with a photo ready, else the newest.
    const ready = { workspaceId: workspace.id, archivedAt: null, frontR2Key: { notIn: ['', 'pending'] } };
    const product =
      (options.productId ? await prisma.product.findFirst({ where: { ...ready, id: options.productId } }) : null) ??
      (await prisma.product.findFirst({ where: { ...ready, soldCount: { not: null } }, orderBy: { soldCount: 'desc' } })) ??
      (await prisma.product.findFirst({ where: ready, orderBy: { createdAt: 'desc' } }));
    if (!product) throw new HttpError(409, 'product_required', 'Add a product first.');
    batch = await createBatch(workspace, { kind: 'shop_products', trial: true, setId: set.id, productIds: [product.id], packId: 'listing', formats: ['square_1_1'], highRes: false });
  }
  await prisma.workspace.update({ where: { id: workspace.id }, data: { trialUsedAt: workspace.trialUsedAt ?? new Date(), onboardingStep: Math.max(workspace.onboardingStep, 4) } });
  return batch;
};
