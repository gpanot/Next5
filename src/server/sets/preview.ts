// server-only — never import from a 'use client' file.

import type { Batch, Workspace } from '@prisma/client';
import type { ThemeScene } from '../../content/business/catalog/types';
import { prisma } from '../../lib/db';
import type { SetPreviewDto } from '../../types/business/catalog';
import { grant } from '../credits/ledger';
import { withSerializable } from '../db/transaction';
import { createBatch, estimateBatch } from '../generation/createBatch';
import type { AnyDraft } from '../generation/draft';
import { pump } from '../generation/pump';
import { HttpError } from '../http';
import { featuredThemeId } from '../onboarding/trial';
import { presignObject } from '../storage/objectStore';

/** Brand: two photos of her in the style. Shop: the listing pack (3 shots) of her newest product. */
const BRAND_PREVIEW_PHOTOS = 2;
/** A preview can be tried again once if every photo failed. */
const MAX_PREVIEW_RUNS = 2;

const latestPreview = (setId: string) => prisma.batch.findFirst({ where: { setId, preview: true }, orderBy: { createdAt: 'desc' } });

/** What the Styles page shows for one style: her own preview photos, or where they are. */
export const previewFor = async (setId: string): Promise<SetPreviewDto> => {
  const batch = await latestPreview(setId);
  if (!batch) return { status: 'none', photos: [] };
  const items = await prisma.batchItem.findMany({ where: { batchId: batch.id, status: 'ready', r2Key: { not: null }, archivedAt: null }, orderBy: { createdAt: 'asc' } });
  const photos = (await Promise.all(items.map((i) => presignObject(i.r2Key!)))).filter((u): u is string => Boolean(u));
  const status = batch.status === 'ready' ? 'ready' : batch.status === 'failed' || batch.status === 'cancelled' ? 'failed' : 'generating';
  return { status: status === 'ready' && photos.length === 0 ? 'failed' : status, photos };
};

const draftFor = async (workspace: Workspace, setId: string): Promise<AnyDraft> => {
  if (workspace.product === 'brand') {
    const themeId = await featuredThemeId();
    const theme = await prisma.theme.findUniqueOrThrow({ where: { id: themeId } });
    const sceneIds = (theme.scenes as unknown as ThemeScene[]).slice(0, BRAND_PREVIEW_PHOTOS).map((s) => s.id);
    return { kind: 'brand_theme', preview: true, setId, themeId, count: BRAND_PREVIEW_PHOTOS, sceneIds, formats: ['portrait_4_5'], highRes: false };
  }
  const product = await prisma.product.findFirst({
    where: { workspaceId: workspace.id, archivedAt: null, frontR2Key: { notIn: ['', 'pending'] } },
    orderBy: { createdAt: 'desc' },
  });
  if (!product) throw new HttpError(409, 'product_required', 'Add a product first to preview this look on it.');
  return { kind: 'shop_products', preview: true, setId, productIds: [product.id], packId: 'listing', formats: ['portrait_4_5'], highRes: false };
};

/**
 * Starts the free "preview on me" photos for one style, once. Free credits cover exactly the photos made,
 * so it never touches her plan. Returns the running or finished preview if there already is one.
 */
export const startPreview = async (workspace: Workspace, setId: string): Promise<Batch> => {
  const set = await prisma.studioSet.findFirst({ where: { id: setId, workspaceId: workspace.id, status: { not: 'archived' } } });
  if (!set) throw new HttpError(404, 'set_not_found', 'Style not found.');
  const previous = await latestPreview(set.id);
  if (previous && previous.status !== 'failed' && previous.status !== 'cancelled') return previous;
  const runs = await prisma.batch.count({ where: { setId: set.id, preview: true } });
  if (runs >= MAX_PREVIEW_RUNS) throw new HttpError(409, 'preview_used', 'This preview could not be made. Create photos with this style instead.');

  const draft = await draftFor(workspace, set.id);
  const { credits } = await estimateBatch(workspace, draft);
  await withSerializable((tx) =>
    grant(tx, { workspaceId: workspace.id, bucket: 'trial', amount: credits, reason: 'trial_grant', refType: 'preview', refId: `${set.id}:${runs}`, expiresAt: null }),
  );
  const batch = await createBatch(workspace, draft);
  await pump({ batchId: batch.id }).catch((err: unknown) => console.error('[preview] pump failed:', err));
  return batch;
};
