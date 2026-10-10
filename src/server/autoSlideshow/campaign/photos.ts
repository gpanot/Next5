// server-only — never import from a 'use client' file.
// The campaign photo picker: what each tab offers (the workspace's generated photos, its brand photos, the shared
// library, Unsplash), and importing a pick into the campaign as its own JPEG copy, so deleting the original never
// breaks the campaign and every source renders the same way.

import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/db';
import type { CampaignPhotoRef, PhotoOptionDto, PhotoTab } from '../../../types/admin/slideshowCampaign';
import { blitzImageKeyWhere } from '../../admin/blitzStore';
import { listBrandPhotos } from '../../brandContent/brandPhotos';
import { HttpError } from '../../http';
import { getObject, presignObject, putObject } from '../../storage/objectStore';
import { listAssets } from '../assets';
import { detectHeads } from '../heads';
import { compressJpeg, PHOTO_SIZE } from '../jpeg';
import type { CampaignPhoto } from './store';
import { fetchUnsplashPhoto, searchUnsplash } from './unsplash';

const SHARED_LIMIT = 120;

const sharedOptions = async (workspaceId: string): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.blitzAsset.findMany({
    where: { type: 'BACKGROUND', OR: [{ workspaceId: null }, { workspaceId }], AND: [blitzImageKeyWhere] },
    orderBy: { createdAt: 'desc' },
    take: SHARED_LIMIT,
    select: { id: true, name: true, r2Key: true, thumbnailKey: true },
  });
  const options = await Promise.all(rows.map(async (r): Promise<PhotoOptionDto | null> => {
    const thumbUrl = await presignObject(r.thumbnailKey ?? r.r2Key);
    return thumbUrl ? { key: `shared:${r.id}`, thumbUrl, ref: { source: 'shared' as const, id: r.id }, label: r.name, credit: null } : null;
  }));
  return options.filter((o): o is PhotoOptionDto => o !== null);
};

/** One tab of the picker. `search` needs `query`; the others list what the workspace has. */
export const photoOptions = async (workspaceId: string, tab: PhotoTab, query: string, page: number): Promise<{ options: PhotoOptionDto[]; hasMore: boolean }> => {
  if (tab === 'search') return query.trim() ? searchUnsplash(query, page) : { options: [], hasMore: false };
  if (tab === 'shared') return { options: await sharedOptions(workspaceId), hasMore: false };
  if (tab === 'brand') {
    const { photos } = await listBrandPhotos(workspaceId);
    const options = photos.flatMap((p) => (p.url ? [{ key: `brand:${p.id}`, thumbUrl: p.url, ref: { source: 'brand' as const, id: p.id }, label: p.description ?? p.filename, credit: null }] : []));
    return { options, hasMore: false };
  }
  const assets = await listAssets(workspaceId);
  const options = assets.flatMap((a) => (a.url ? [{ key: `generated:${a.runId}:${a.index}`, thumbUrl: a.url, ref: { source: 'generated' as const, runId: a.runId, index: a.index }, label: a.prompt, credit: null }] : []));
  return { options, hasMore: false };
};

type Fetched = { bytes: Buffer; label: string; credit?: { name: string; url: string } };

const stored = async (key: string | null | undefined): Promise<Buffer> => {
  const bytes = key ? await getObject(key) : null;
  if (!bytes) throw new HttpError(404, 'photo_missing', 'That photo is gone. Pick another one.');
  return bytes;
};

/** The picked photo's bytes, checked to belong to this workspace (or the shared library). */
const fetchPick = async (workspaceId: string, ref: CampaignPhotoRef): Promise<Fetched> => {
  if (ref.source === 'unsplash') return fetchUnsplashPhoto(ref.id);
  if (ref.source === 'brand') {
    const row = await prisma.userUpload.findFirst({ where: { id: ref.id, workspaceId, kind: 'photo', archivedAt: null } });
    return { bytes: await stored(row?.r2Key), label: row?.description ?? row?.filename ?? 'Brand photo' };
  }
  if (ref.source === 'shared') {
    const row = await prisma.blitzAsset.findFirst({ where: { id: ref.id, type: 'BACKGROUND', OR: [{ workspaceId: null }, { workspaceId }] } });
    return { bytes: await stored(row?.r2Key), label: row?.name ?? 'Library photo' };
  }
  const run = await prisma.autoSlideshowRun.findFirst({ where: { id: ref.runId, workspaceId }, select: { photos: true } });
  const photo = (run?.photos as unknown as CampaignPhoto[] | null)?.[ref.index];
  return { bytes: await stored(photo?.imageKey), label: photo?.prompt ?? 'Generated photo' };
};

export const parsePhotoRef = (v: unknown): CampaignPhotoRef => {
  const r = (v ?? {}) as Record<string, unknown>;
  if (r.source === 'generated' && typeof r.runId === 'string' && Number.isInteger(r.index)) return { source: 'generated', runId: r.runId, index: r.index as number };
  if ((r.source === 'brand' || r.source === 'shared' || r.source === 'unsplash') && typeof r.id === 'string') return { source: r.source, id: r.id };
  throw new HttpError(400, 'bad_photo', 'Pick a photo.');
};

/**
 * Copies the pick into the campaign (9:16 JPEG at photo size) and appends it to the run's photos in one statement, so
 * two imports at once never drop each other. Returns the new photo's index, and its head detection to run afterwards.
 */
export const importPhoto = async (runId: string, workspaceId: string, ref: CampaignPhotoRef): Promise<{ index: number; detect: () => Promise<void> }> => {
  const pick = await fetchPick(workspaceId, ref);
  const jpeg = await compressJpeg(pick.bytes, PHOTO_SIZE).catch(() => {
    throw new HttpError(422, 'bad_image', 'That file is not a photo we can use. Pick another one.');
  });
  const imageKey = `admin/auto-slideshow/${runId}/campaign-${randomUUID()}.jpg`;
  await putObject(imageKey, jpeg, 'image/jpeg');
  const photo: CampaignPhoto = { prompt: pick.label.slice(0, 300), imageKey, error: null, source: ref.source, ...(pick.credit ? { credit: pick.credit } : {}) };
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    UPDATE public.auto_slideshow_runs
    SET photos = COALESCE(photos, '[]'::jsonb) || jsonb_build_array(${JSON.stringify(photo)}::jsonb), updated_at = now()
    WHERE id = ${runId}
    RETURNING jsonb_array_length(photos) AS count`;
  const count = rows[0]?.count;
  if (count === undefined) throw new HttpError(404, 'campaign_not_found', 'Campaign not found.');
  const index = Number(count) - 1;
  return { index, detect: () => storeHeads(runId, index, jpeg) };
};

/**
 * Finds the photo's heads (the slide text keeps off them) and stores them on it, run after the import's response so
 * "Make" does not wait for it. A failed detection stores none: the text keeps its usual spot, and nothing retries.
 */
const storeHeads = async (runId: string, index: number, jpeg: Buffer): Promise<void> => {
  const heads = (await detectHeads(`data:image/jpeg;base64,${jpeg.toString('base64')}`)) ?? [];
  await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET photos = jsonb_set(photos, ARRAY[${String(index)}, 'heads'], ${JSON.stringify(heads)}::jsonb)
    WHERE id = ${runId} AND jsonb_array_length(photos) > ${index}`;
};
