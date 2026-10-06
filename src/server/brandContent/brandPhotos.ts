// server-only — never import from a 'use client' file.
// Your Brand Content: the workspace's own photos, stored as user_uploads rows (kind "photo"). Nothing uses them yet;
// they are kept to reuse in slideshows later. Videos will join the same table (kind "video").

import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/db';
import { MAX_BRAND_PHOTOS, type BrandPhotoDto, type BrandPhotosDto } from '../../types/admin/brandContent';
import { HttpError } from '../http';
import { presignObject, putObject } from '../storage/objectStore';
import { compressBrandPhoto } from './compressPhoto';
import { describeBrandPhoto } from './describePhoto';

type Row = { id: string; r2Key: string; filename: string; description: string | null; createdAt: Date };

const dto = async (row: Row): Promise<BrandPhotoDto> => ({
  id: row.id,
  url: await presignObject(row.r2Key),
  filename: row.filename,
  description: row.description,
  createdAt: row.createdAt.toISOString(),
});

const live = (workspaceId: string) => ({ workspaceId, kind: 'photo', archivedAt: null });

/** The workspace's photos, newest first. */
export async function listBrandPhotos(workspaceId: string): Promise<BrandPhotosDto> {
  const rows = await prisma.userUpload.findMany({ where: live(workspaceId), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: MAX_BRAND_PHOTOS });
  return { photos: await Promise.all(rows.map(dto)) };
}

/**
 * Saves one photo, compressed (~600 KB, longest side 1920 px, see ./compressPhoto.ts). `describe` is the
 * vision description, for the caller to run after the response (it stores its result on the row).
 */
export async function addBrandPhoto(workspaceId: string, file: File): Promise<{ photo: BrandPhotoDto; describe: () => Promise<void> }> {
  const count = await prisma.userUpload.count({ where: live(workspaceId) });
  if (count >= MAX_BRAND_PHOTOS) throw new HttpError(409, 'too_many_photos', `You can keep up to ${MAX_BRAND_PHOTOS} photos. Delete a few first.`);
  const buffer = await compressBrandPhoto(file);
  const r2Key = `user-uploads/${workspaceId}/${randomUUID()}.jpg`;
  await putObject(r2Key, buffer, 'image/jpeg');
  const row = await prisma.userUpload.create({
    data: { workspaceId, r2Key, filename: file.name.slice(0, 200) || 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: buffer.length, kind: 'photo' },
  });
  return { photo: await dto(row), describe: () => describeBrandPhoto(row.id, buffer) };
}

/** Removes one photo from the list (kept in storage, archived). */
export async function archiveBrandPhoto(workspaceId: string, id: string): Promise<void> {
  const { count } = await prisma.userUpload.updateMany({ where: { id, ...live(workspaceId) }, data: { archivedAt: new Date() } });
  if (count === 0) throw new HttpError(404, 'not_found', 'Photo not found.');
}
