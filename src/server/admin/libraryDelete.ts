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
import { audit } from './route';

export const LIBRARY_SECTIONS = ['memes', 'videos', 'sounds', 'aiPictures', 'ugcVideos', 'hookVideos'] as const;
export type LibrarySection = (typeof LIBRARY_SECTIONS)[number];

export const isLibrarySection = (value: unknown): value is LibrarySection =>
  typeof value === 'string' && (LIBRARY_SECTIONS as readonly string[]).includes(value);

/** Most assets one request may delete. */
export const MAX_BULK_DELETE = 200;

/** Scheduled posts still to be rendered read their files from R2 at render time. */
const PENDING_POST_STATUSES = ['planned', 'scheduled', 'rendering'];

/** Auto Slideshows not rendered yet still need their sound. */
const PENDING_SLIDESHOW_STATUSES = ['written', 'rendering'];

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

/**
 * Text of everything that still reads library files later: render bodies of pending posts and
 * the assets of queued or running renders. A file whose key shows up here is kept.
 */
async function filesStillNeeded(): Promise<string[]> {
  const posts = await prisma.$queryRaw<Array<{ body: string }>>`
    SELECT render_body::text AS body FROM blitz_scheduled_posts
    WHERE status = ANY(${PENDING_POST_STATUSES}::text[]) AND render_body IS NOT NULL`;
  const renders = await prisma.blitzProject.findMany({
    where: { renderStatus: { in: ['PENDING', 'PROCESSING'] } },
    select: { currentAssets: true },
  });
  return [...posts.map((p) => p.body), ...renders.map((r) => JSON.stringify(r.currentAssets))];
}

/** Sound ids picked by Auto Slideshows that are not rendered yet. */
async function soundsInPendingSlideshows(ids: string[]): Promise<Set<string>> {
  const rows = await prisma.autoSlideshow.findMany({
    where: { audioAssetId: { in: ids }, status: { in: PENDING_SLIDESHOW_STATUSES } },
    select: { audioAssetId: true },
  });
  return new Set(rows.map((r) => r.audioAssetId).filter((id): id is string => Boolean(id)));
}

/** Why this Blitz asset must stay, or null when it can go. */
function keepReason(asset: BlitzAsset | undefined, section: LibrarySection, needed: string[], sounds: Set<string>): string | null {
  if (!asset || !inSection(asset, section)) return 'Asset not found.';
  if (needed.some((text) => text.includes(asset.r2Key))) return 'Used by a post or render that is not finished yet.';
  if (sounds.has(asset.id)) return 'Used by an Auto Slideshow that is not rendered yet.';
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
  const [needed, sounds] = await Promise.all([filesStillNeeded(), soundsInPendingSlideshows(ids)]);
  const result: BulkDeleteResult = { deleted: [], failed: [] };

  for (const id of ids) {
    const asset = byId.get(id);
    const reason = keepReason(asset, section, needed, sounds);
    if (reason || !asset) {
      result.failed.push({ id, error: reason ?? 'Asset not found.' });
      continue;
    }
    try {
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
 * Deletes each asset of the section, one by one. An asset a pending post, a running render or an
 * unrendered Auto Slideshow still needs is kept and reported in `failed`; the others go.
 */
export async function deleteLibraryAssets(section: LibrarySection, ids: string[]): Promise<BulkDeleteResult> {
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id))];
  if (unique.length === 0) throw new HttpError(400, 'no_ids', 'Pick at least one asset.');
  if (unique.length > MAX_BULK_DELETE) throw new HttpError(400, 'too_many', `Delete at most ${MAX_BULK_DELETE} assets at once.`);
  return section === 'ugcVideos' ? deleteUgcVideos(unique) : deleteBlitzAssets(section, unique);
}
