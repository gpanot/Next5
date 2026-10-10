// server-only — never import from a 'use client' file.
// The campaign photo picker: what each tab offers (the workspace's generated photos, its brand photos, the shared
// library, Unsplash), and importing a pick into the campaign as its own JPEG copy, so deleting the original never
// breaks the campaign and every source renders the same way.

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '../../../lib/db';
import type { CampaignPhotoDto, CampaignPhotoRef, PhotoOptionDto, PhotoTab } from '../../../types/admin/slideshowCampaign';
import { blitzImageKeyWhere } from '../../admin/blitzStore';
import { HttpError } from '../../http';
import { getObject, putObject } from '../../storage/objectStore';
import { storeThumb, thumbUrl } from '../../storage/thumbs';
import { detectHeads } from '../heads';
import { compressJpeg, MAX_JPEG_BYTES, PHOTO_SIZE } from '../jpeg';
import type { CampaignPhoto } from './store';
import { fetchUnsplashPhoto, searchUnsplash } from './unsplash';

const SHARED_LIMIT = 120;
const BRAND_LIMIT = 200;
/** Recent auto runs whose photos the Generated tab offers. */
const GENERATED_RUNS = 30;

const sharedOptions = async (workspaceId: string): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.blitzAsset.findMany({
    where: { type: 'BACKGROUND', OR: [{ workspaceId: null }, { workspaceId }], AND: [blitzImageKeyWhere] },
    orderBy: { createdAt: 'desc' },
    take: SHARED_LIMIT,
    select: { id: true, name: true, r2Key: true, thumbnailKey: true },
  });
  return rows.map((r) => ({ key: `shared:${r.id}`, thumbUrl: thumbUrl(r.thumbnailKey ?? r.r2Key), ref: { source: 'shared' as const, id: r.id }, label: r.name, credit: null }));
};

const brandOptions = async (workspaceId: string): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.userUpload.findMany({
    where: { workspaceId, kind: 'photo', archivedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: BRAND_LIMIT,
    select: { id: true, r2Key: true, description: true, filename: true },
  });
  return rows.map((r) => ({ key: `brand:${r.id}`, thumbUrl: thumbUrl(r.r2Key), ref: { source: 'brand' as const, id: r.id }, label: r.description ?? r.filename, credit: null }));
};

/** The workspace's generated photos, newest run first. SQL reads only each photo's key and a short label: the stored
 *  photo lists also hold long prompts and settings, which made this tab slow. */
const generatedOptions = async (workspaceId: string): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.$queryRaw<Array<{ run_id: string; idx: bigint; image_key: string; label: string | null }>>`
    SELECT r.id AS run_id, p.ord - 1 AS idx, p.elem->>'imageKey' AS image_key, left(p.elem->>'prompt', 120) AS label
    FROM (
      SELECT id, photos, created_at FROM public.auto_slideshow_runs
      WHERE workspace_id = ${workspaceId} AND kind = 'auto' AND photos IS NOT NULL
      ORDER BY created_at DESC LIMIT ${GENERATED_RUNS}
    ) r
    CROSS JOIN LATERAL jsonb_array_elements(r.photos) WITH ORDINALITY AS p(elem, ord)
    WHERE p.elem->>'imageKey' IS NOT NULL AND p.elem->'deleted' IS NULL
    ORDER BY r.created_at DESC, p.ord`;
  return rows.map((r) => {
    const index = Number(r.idx);
    return { key: `generated:${r.run_id}:${index}`, thumbUrl: thumbUrl(r.image_key), ref: { source: 'generated' as const, runId: r.run_id, index }, label: r.label ?? 'Generated photo', credit: null };
  });
};

/** One tab of the picker. `search` needs `query`; the others list what the workspace has. */
export const photoOptions = async (workspaceId: string, tab: PhotoTab, query: string, page: number): Promise<{ options: PhotoOptionDto[]; hasMore: boolean }> => {
  if (tab === 'search') return query.trim() ? searchUnsplash(query, page) : { options: [], hasMore: false };
  if (tab === 'shared') return { options: await sharedOptions(workspaceId), hasMore: false };
  if (tab === 'brand') return { options: await brandOptions(workspaceId), hasMore: false };
  return { options: await generatedOptions(workspaceId), hasMore: false };
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

/** The pick as a 9:16 JPEG at photo size, in one encode; the quality-stepping compressor only when that is too big. */
const toCampaignJpeg = async (bytes: Buffer): Promise<Buffer> => {
  const jpeg = await sharp(bytes).rotate().resize(PHOTO_SIZE.width, PHOTO_SIZE.height, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
  return jpeg.length <= MAX_JPEG_BYTES ? jpeg : compressJpeg(jpeg);
};

/**
 * Copies the pick into the campaign (with its thumb) and appends it to the run's photos in one statement, so imports
 * running at once never drop each other. Returns the new photo, and its head detection to run after the response.
 */
export const importPhoto = async (runId: string, workspaceId: string, ref: CampaignPhotoRef): Promise<{ photo: CampaignPhotoDto; detect: () => Promise<void> }> => {
  const pick = await fetchPick(workspaceId, ref);
  const jpeg = await toCampaignJpeg(pick.bytes).catch(() => {
    throw new HttpError(422, 'bad_image', 'That file is not a photo we can use. Pick another one.');
  });
  const imageKey = `admin/auto-slideshow/${runId}/campaign-${randomUUID()}.jpg`;
  await Promise.all([putObject(imageKey, jpeg, 'image/jpeg'), storeThumb(imageKey, jpeg)]);
  const photo: CampaignPhoto = { prompt: pick.label.slice(0, 300), imageKey, error: null, source: ref.source, ...(pick.credit ? { credit: pick.credit } : {}) };
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    UPDATE public.auto_slideshow_runs
    SET photos = COALESCE(photos, '[]'::jsonb) || jsonb_build_array(${JSON.stringify(photo)}::jsonb), updated_at = now()
    WHERE id = ${runId}
    RETURNING jsonb_array_length(photos) AS count`;
  const count = rows[0]?.count;
  if (count === undefined) throw new HttpError(404, 'campaign_not_found', 'Campaign not found.');
  const index = Number(count) - 1;
  return { photo: { index, url: thumbUrl(imageKey), source: ref.source, credit: pick.credit ?? null }, detect: () => storeHeads(runId, index, jpeg) };
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
