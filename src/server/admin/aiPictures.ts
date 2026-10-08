// server-only — never import from a 'use client' file.
// Bulk delete for the admin Assets Library "AI Pictures" section: removes poor images from the
// library (row, description, embedding and file) so no future deck picks them.

import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { deleteDeckImage } from '../labs/deckImages';
import { audit } from './route';

/** Most images one request may delete. */
export const MAX_BULK_DELETE = 200;

/** Scheduled posts still to be rendered read their slide images from R2 at render time. */
const PENDING_POST_STATUSES = ['planned', 'scheduled', 'rendering'];

export type BulkDeleteResult = {
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
};

/** R2 keys used as slide backgrounds by posts not rendered yet. */
async function keysInPendingPosts(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ key: string }>>`
    SELECT DISTINCT s->>'backgroundKey' AS key
    FROM blitz_scheduled_posts p, jsonb_array_elements(p.render_body->'slides') s
    WHERE p.status = ANY(${PENDING_POST_STATUSES}::text[]) AND s->>'backgroundKey' IS NOT NULL`;
  return new Set(rows.map((r) => r.key));
}

/**
 * Deletes each image, one by one. An image a pending post or a running render still needs is
 * kept and reported in `failed`; the others go.
 */
export async function deleteAiPictures(ids: string[]): Promise<BulkDeleteResult> {
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id))];
  if (unique.length === 0) throw new HttpError(400, 'no_ids', 'Pick at least one image.');
  if (unique.length > MAX_BULK_DELETE) throw new HttpError(400, 'too_many', `Delete at most ${MAX_BULK_DELETE} images at once.`);

  const assets = await prisma.blitzAsset.findMany({ where: { id: { in: unique } }, select: { id: true, r2Key: true, name: true } });
  const byId = new Map(assets.map((a) => [a.id, a]));
  const pending = await keysInPendingPosts();
  const result: BulkDeleteResult = { deleted: [], failed: [] };

  for (const id of unique) {
    const asset = byId.get(id);
    if (!asset) {
      result.failed.push({ id, error: 'Image not found.' });
      continue;
    }
    if (pending.has(asset.r2Key)) {
      result.failed.push({ id, error: 'Used by a scheduled post that is not rendered yet.' });
      continue;
    }
    try {
      await deleteDeckImage(id);
      result.deleted.push(id);
      await audit('ai_picture.delete', 'blitz_asset', id, { r2Key: asset.r2Key, name: asset.name }).catch(() => undefined);
    } catch (err) {
      result.failed.push({ id, error: err instanceof Error ? err.message : 'Delete failed.' });
    }
  }
  return result;
}
