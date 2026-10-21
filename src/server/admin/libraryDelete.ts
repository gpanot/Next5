// server-only — never import from a 'use client' file.
// Bulk delete for every section of the admin Assets Library (Memes, Videos, Sounds, AI Pictures,
// UGC Videos, Hook Videos): removes the row (description and embedding cascade) and its files.

import type { BlitzAsset } from '@prisma/client';
import { prisma } from '../../lib/db';
import { deleteFromR2 } from '../../lib/r2';
import { HttpError } from '../http';
import { deleteDeckImage } from '../labs/deckImages';
import { blitzMediaKind } from './blitzStore';
import { deleteFiles } from './ugcStore';
import { isInUse, loadPendingUses, pickReplacement, swapAsset, type PendingUses } from './libraryAssetSwap';
import { audit } from './route';

export const LIBRARY_SECTIONS = ['memes', 'videos', 'sounds', 'aiPictures', 'ugcVideos', 'hookVideos'] as const;
export type LibrarySection = (typeof LIBRARY_SECTIONS)[number];

export const isLibrarySection = (value: unknown): value is LibrarySection =>
  typeof value === 'string' && (LIBRARY_SECTIONS as readonly string[]).includes(value);

/** Most assets one request may delete. */
export const MAX_BULK_DELETE = 200;

export type BulkDeleteResult = {
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
};

/** True when the Blitz asset belongs to this section of the library. */
function inSection(asset: BlitzAsset, section: LibrarySection): boolean {
  const kind = blitzMediaKind(asset.r2Key);
  if (section === 'memes') return asset.type === 'OVERLAY';
  if (section === 'videos') return asset.type === 'BACKGROUND' && kind === 'video';
  if (section === 'aiPictures') return asset.type === 'BACKGROUND' && kind === 'image';
  if (section === 'sounds') return asset.type === 'AUDIO';
  if (section === 'hookVideos') return asset.type === 'HOOK';
  return false;
}

/** Swaps a random stand-in into pending work that uses the asset. Returns why it must stay, or null when it can go. */
async function freeForDelete(asset: BlitzAsset | undefined, section: LibrarySection, uses: PendingUses, ids: string[]): Promise<string | null> {
  if (!asset || !inSection(asset, section)) return 'Asset not found.';
  if (!(await isInUse(asset, uses))) return null;
  const replacement = await pickReplacement(asset, ids);
  if (!replacement) return 'Used by a post or render that is not finished yet, and no other asset can replace it.';
  await swapAsset(asset, replacement, uses);
  return null;
}

async function deleteBlitzAsset(asset: BlitzAsset, section: LibrarySection): Promise<void> {
  if (section === 'aiPictures') {
    await deleteDeckImage(asset.id);
    return;
  }
  await prisma.blitzAsset.delete({ where: { id: asset.id } });
  await deleteFromR2(asset.r2Key).catch((err) => console.warn('[libraryDelete] file delete failed:', err));
}

async function deleteBlitzAssets(section: LibrarySection, ids: string[]): Promise<BulkDeleteResult> {
  const assets = await prisma.blitzAsset.findMany({ where: { id: { in: ids } } });
  const byId = new Map(assets.map((a) => [a.id, a]));
  const uses = await loadPendingUses();
  const result: BulkDeleteResult = { deleted: [], failed: [] };

  for (const id of ids) {
    const asset = byId.get(id);
    try {
      const reason = await freeForDelete(asset, section, uses, ids);
      if (reason || !asset) {
        result.failed.push({ id, error: reason ?? 'Asset not found.' });
        continue;
      }
      await deleteBlitzAsset(asset, section);
      result.deleted.push(id);
      await audit(`library.${section}.delete`, 'blitz_asset', id, { r2Key: asset.r2Key, name: asset.name }).catch(() => undefined);
    } catch (err) {
      result.failed.push({ id, error: err instanceof Error ? err.message : 'Delete failed.' });
    }
  }
  return result;
}

/** UGC videos owned by Next5 (no workspace): row plus raw and captioned files. */
async function deleteUgcVideos(ids: string[]): Promise<BulkDeleteResult> {
  const videos = await prisma.ugcVideo.findMany({ where: { id: { in: ids }, workspaceId: null } });
  const byId = new Map(videos.map((v) => [v.id, v]));
  const result: BulkDeleteResult = { deleted: [], failed: [] };

  for (const id of ids) {
    const video = byId.get(id);
    if (!video) {
      result.failed.push({ id, error: 'Video not found.' });
      continue;
    }
    try {
      await prisma.ugcVideo.delete({ where: { id } });
      await deleteFiles([video.rawKey, video.captionedKey]);
      result.deleted.push(id);
      await audit('library.ugcVideos.delete', 'ugc_video', id, { script: video.script.slice(0, 200) }).catch(() => undefined);
    } catch (err) {
      result.failed.push({ id, error: err instanceof Error ? err.message : 'Delete failed.' });
    }
  }
  return result;
}

/**
 * Deletes each asset of the section, one by one. When a pending post, a running render or an
 * unrendered Auto Slideshow still uses an asset, a random asset of the same section replaces it there first.
 */
export async function deleteLibraryAssets(section: LibrarySection, ids: string[]): Promise<BulkDeleteResult> {
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id))];
  if (unique.length === 0) throw new HttpError(400, 'no_ids', 'Pick at least one asset.');
  if (unique.length > MAX_BULK_DELETE) throw new HttpError(400, 'too_many', `Delete at most ${MAX_BULK_DELETE} assets at once.`);
  return section === 'ugcVideos' ? deleteUgcVideos(unique) : deleteBlitzAssets(section, unique);
}
