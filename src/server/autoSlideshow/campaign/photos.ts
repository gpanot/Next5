// server-only — never import from a 'use client' file.
// The campaign photo picker: what each tab offers (the workspace's App shots and generated photos, its brand photos, the shared
// library, Unsplash), and importing a pick into the campaign as its own JPEG copy, so deleting the original never
// breaks the campaign and every source renders the same way. Also the Auto content's photos (made or found per slide).

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '../../../lib/db';
import type { HeadBox } from '../../../types/admin/autoSlideshow';
import type { AutoPhotoRequest, CampaignPhotoDto, CampaignPhotoRef, PhotoOptionDto, PhotoTab } from '../../../types/admin/slideshowCampaign';
import { blitzImageKeyWhere } from '../../admin/blitzStore';
import { HttpError } from '../../http';
import { createMeter } from '../../metaAds/cost';
import { getObject, presignObject, putObject } from '../../storage/objectStore';
import { storeThumb, thumbUrl } from '../../storage/thumbs';
import { detectHeads, inspectPhoto } from '../heads';
import { compressJpeg, MAX_JPEG_BYTES, PHOTO_SIZE } from '../jpeg';
import { ctaPhotoRefs, productCtaPhoto, type CastFace } from '../ctaPhoto';
import { photoPrompt, slideshowPhoto } from '../photos';
import { CAMPAIGN_KIND, type CampaignPhoto } from './store';
import { appShotOptions, fetchAppShot } from './appShot/store';
import { campaignCast } from './campaignCast';
import { fetchUnsplashPhoto, searchedUnsplashPhoto, searchUnsplash } from './unsplash';

const SHARED_LIMIT = 120;
const BRAND_LIMIT = 200;
/** Recent auto runs whose photos the Generated tab offers. */
const GENERATED_RUNS = 30;

export const sharedOptions = async (workspaceId: string): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.blitzAsset.findMany({
    where: { type: 'BACKGROUND', OR: [{ workspaceId: null }, { workspaceId }], AND: [blitzImageKeyWhere] },
    orderBy: { createdAt: 'desc' },
    take: SHARED_LIMIT,
    select: { id: true, name: true, r2Key: true, thumbnailKey: true },
  });
  return rows.map((r) => ({ key: `shared:${r.id}`, thumbUrl: thumbUrl(r.thumbnailKey ?? r.r2Key), ref: { source: 'shared' as const, id: r.id }, label: r.name, credit: null }));
};

export const brandOptions = async (workspaceId: string): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.userUpload.findMany({
    where: { workspaceId, kind: 'photo', archivedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: BRAND_LIMIT,
    select: { id: true, r2Key: true, description: true, filename: true },
  });
  return rows.map((r) => ({ key: `brand:${r.id}`, thumbUrl: thumbUrl(r.r2Key), ref: { source: 'brand' as const, id: r.id }, label: r.description ?? r.filename, credit: null }));
};

/** Recent campaigns whose AI photos the Generated tab offers. */
const GENERATED_CAMPAIGNS = 30;
/** How much of a label is compared to spot an older campaign copy of a photo already listed. */
const LABEL_MATCH = 120;

type GeneratedRow = { run_id: string; idx: bigint; image_key: string; label: string | null; kind: string; origin: string | null };

/**
 * The workspace's generated photos, newest run first: the auto slideshows' photos and the AI photos made in its
 * campaigns. A campaign also keeps copies of photos picked from this tab or from App shots; those are skipped (by
 * `origin`, or by label on photos stored before it). SQL reads only each photo's key and a short label: the stored
 * photo lists also hold long prompts and settings, which made this tab slow.
 */
const generatedOptions = async (workspaceId: string, shotLabels: string[]): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.$queryRaw<GeneratedRow[]>`
    SELECT r.id AS run_id, r.kind, p.ord - 1 AS idx, p.elem->>'imageKey' AS image_key, left(p.elem->>'prompt', ${LABEL_MATCH}::int) AS label, p.elem->>'origin' AS origin
    FROM (
      (SELECT id, kind, photos, created_at FROM public.auto_slideshow_runs
       WHERE workspace_id = ${workspaceId} AND kind = 'auto' AND photos IS NOT NULL
       ORDER BY created_at DESC LIMIT ${GENERATED_RUNS})
      UNION ALL
      (SELECT id, kind, photos, created_at FROM public.auto_slideshow_runs
       WHERE workspace_id = ${workspaceId} AND kind = ${CAMPAIGN_KIND} AND photos IS NOT NULL
       ORDER BY created_at DESC LIMIT ${GENERATED_CAMPAIGNS})
    ) r
    CROSS JOIN LATERAL jsonb_array_elements(r.photos) WITH ORDINALITY AS p(elem, ord)
    WHERE p.elem->>'imageKey' IS NOT NULL AND p.elem->'deleted' IS NULL
      AND (r.kind = 'auto' OR (COALESCE(p.elem->>'source', 'generated') = 'generated' AND COALESCE(p.elem->>'origin', 'ai') = 'ai'))
    ORDER BY r.created_at DESC, p.ord`;
  const known = new Set([...shotLabels.map((l) => l.slice(0, LABEL_MATCH)), ...rows.filter((r) => r.kind === 'auto' && r.label).map((r) => r.label!)]);
  const seen = new Set<string>();
  // Older campaign photos have no origin: a label already listed (an auto photo or an App shot) is a copy.
  const fresh = rows.filter((r) => r.kind === 'auto' || r.origin === 'ai' || !r.label || !known.has(r.label));
  return fresh.flatMap((r) => {
    if (seen.has(r.image_key)) return [];
    seen.add(r.image_key);
    const index = Number(r.idx);
    return [{ key: `generated:${r.run_id}:${index}`, thumbUrl: thumbUrl(r.image_key), ref: { source: 'generated' as const, runId: r.run_id, index }, label: r.label ?? 'Generated photo', credit: null }];
  });
};

/** One tab of the picker. `search` needs `query`; the others list what the workspace has. */
export const photoOptions = async (workspaceId: string, tab: PhotoTab, query: string, page: number): Promise<{ options: PhotoOptionDto[]; hasMore: boolean }> => {
  if (tab === 'search') return query.trim() ? searchUnsplash(query, page) : { options: [], hasMore: false };
  if (tab === 'shared') return { options: await sharedOptions(workspaceId), hasMore: false };
  if (tab === 'brand') return { options: await brandOptions(workspaceId), hasMore: false };
  const shots = await appShotOptions(workspaceId);
  return { options: [...shots, ...(await generatedOptions(workspaceId, shots.map((s) => s.label)))], hasMore: false };
};

type Fetched = { bytes: Buffer; label: string; credit?: { name: string; url: string }; hotlink?: { thumb: string; full: string } };

const stored = async (key: string | null | undefined): Promise<Buffer> => {
  const bytes = key ? await getObject(key) : null;
  if (!bytes) throw new HttpError(404, 'photo_missing', 'That photo is gone. Pick another one.');
  return bytes;
};

/** The picked photo's bytes, checked to belong to this workspace (or the shared library). */
const fetchPick = async (workspaceId: string, ref: CampaignPhotoRef): Promise<Fetched> => {
  if (ref.source === 'unsplash') return fetchUnsplashPhoto(ref.id);
  if (ref.source === 'app_shot') return fetchAppShot(workspaceId, ref.id);
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
  if ((r.source === 'brand' || r.source === 'shared' || r.source === 'unsplash' || r.source === 'app_shot') && typeof r.id === 'string') return { source: r.source, id: r.id };
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
export const importPhoto = async (runId: string, workspaceId: string, ref: CampaignPhotoRef): Promise<{ photo: CampaignPhotoDto; detect: () => Promise<void> }> =>
  storeCampaignPhoto(runId, await fetchPick(workspaceId, ref), ref.source === 'app_shot' ? 'generated' : ref.source, ref.source === 'app_shot' || ref.source === 'generated' ? 'copy' : undefined);

/** Tells the photo model reference image `n` only sets the look, so the content slides match the hook photo's tone. */
const toneNote = (n: number) =>
  `Image ${n} only sets the look: match its color grade, light, contrast and mood (black and white if it is), over the style above. Do not copy its subject, objects, people or layout.`;

/** A signed link to campaign photo `index` (the first hook photo), or null when it has none. */
const tonePhotoUrl = async (runId: string, index: number): Promise<string | null> => {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { id: runId }, select: { photos: true } });
  const key = (run?.photos as unknown as CampaignPhoto[] | null)?.[index]?.imageKey;
  return key ? presignObject(key) : null;
};

/** The CTA photo's prompt and references: the campaign's avatar and the product first, then the hook photo for the tone. */
const ctaPrompt = async (runId: string, scene: string, tone: string | null, avatar: CastFace | null): Promise<{ prompt: string; refs: string[] }> => {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { id: runId }, select: { workspaceId: true } });
  const cast = run?.workspaceId ? await ctaPhotoRefs(run.workspaceId, avatar) : { look: null, urls: [], notes: [] };
  const refs = [...cast.urls, ...(tone ? [tone] : [])];
  const notes = [...cast.notes, ...(tone ? [toneNote(refs.length)] : [])];
  const withPerson = cast.look ? `${scene} The main person: ${cast.look}` : scene;
  return { prompt: photoPrompt(withPerson, undefined, notes.join(' ') || undefined), refs };
};

/** A content slide's prompt and references: the campaign's avatar (whenever a person is in the scene), then the hook
 *  photo for the tone. */
const contentPrompt = async (scene: string, tone: string | null, avatar: CastFace | null): Promise<{ prompt: string; refs: string[] }> => {
  const signed = avatar ? await presignObject(avatar.key, 60 * 60).catch(() => null) : null;
  const face = avatar && signed?.startsWith('https://') ? signed : null;
  const refs = [...(face ? [face] : []), ...(tone ? [tone] : [])];
  const notes = [
    ...(face ? ['Image 1 is the main person: whenever a person is in the photo, it is this SAME person (face, hair, skin tone, build); change the pose, place and clothes as described here.'] : []),
    ...(tone ? [toneNote(refs.length)] : []),
  ];
  const withPerson = face ? `${scene} If a person is in the photo, it is the main person: ${avatar!.look}` : scene;
  return { prompt: photoPrompt(withPerson, undefined, notes.join(' ') || undefined), refs };
};

/**
 * One photo for the Content tab's "Auto": an AI photo of the scene (on the photo engine the auto slideshows use, bright
 * style, in the tone of the first hook photo when sent), or the `nth` portrait result of a stock search. Stored like a
 * picked photo.
 */
export const autoPhoto = async (runId: string, req: AutoPhotoRequest): Promise<{ photo: CampaignPhotoDto; detect: () => Promise<void> }> => {
  if (req.source === 'stock') {
    return storeCampaignPhoto(runId, await searchedUnsplashPhoto(req.query, req.nth), 'unsplash');
  }
  const [tone, avatar] = await Promise.all([req.tonePhoto === undefined ? null : tonePhotoUrl(runId, req.tonePhoto), campaignCast(runId)]);
  const { prompt, refs } = req.cta && productCtaPhoto() ? await ctaPrompt(runId, req.scene, tone, avatar) : await contentPrompt(req.scene, tone, avatar);
  const make = async () => {
    const { buffer } = await slideshowPhoto(prompt, refs, createMeter()).catch((err: unknown) => {
      throw new HttpError(502, 'photo_failed', err instanceof Error ? `Photo failed: ${err.message.slice(0, 120)}` : 'Photo failed. Try again.');
    });
    const jpeg = await toCampaignJpeg(buffer);
    return { jpeg, check: await inspectPhoto(`data:image/jpeg;base64,${jpeg.toString('base64')}`) };
  };
  // A body mistake (a third hand, a cut leg) gets the photo made once more; a redo still flawed or failing keeps the first.
  let made = await make();
  if (made.check.flaw) {
    console.warn(`[campaign] auto photo flawed (${made.check.flaw}), making it again`);
    made = await make().catch(() => made);
  }
  const heads = made.check.heads;
  const stored = await storeCampaignPhoto(runId, { bytes: made.jpeg, label: req.scene }, 'generated', 'ai');
  return heads ? { photo: { ...stored.photo, heads }, detect: () => storeFoundHeads(runId, stored.photo.index, heads) } : stored;
};

const storeCampaignPhoto = async (runId: string, pick: Fetched, source: CampaignPhotoDto['source'], origin?: CampaignPhoto['origin']): Promise<{ photo: CampaignPhotoDto; detect: () => Promise<void> }> => {
  const jpeg = await toCampaignJpeg(pick.bytes).catch(() => {
    throw new HttpError(422, 'bad_image', 'That file is not a photo we can use. Pick another one.');
  });
  const imageKey = `admin/auto-slideshow/${runId}/campaign-${randomUUID()}.jpg`;
  await Promise.all([putObject(imageKey, jpeg, 'image/jpeg'), storeThumb(imageKey, jpeg)]);
  const photo: CampaignPhoto = { prompt: pick.label.slice(0, 300), imageKey, error: null, source, ...(origin ? { origin } : {}), ...(pick.credit ? { credit: pick.credit } : {}), ...(pick.hotlink ? { hotlink: pick.hotlink } : {}) };
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    UPDATE public.auto_slideshow_runs
    SET photos = COALESCE(photos, '[]'::jsonb) || jsonb_build_array(${JSON.stringify(photo)}::jsonb), updated_at = now()
    WHERE id = ${runId}
    RETURNING jsonb_array_length(photos) AS count`;
  const count = rows[0]?.count;
  if (count === undefined) throw new HttpError(404, 'campaign_not_found', 'Campaign not found.');
  const index = Number(count) - 1;
  const url = pick.hotlink?.thumb ?? thumbUrl(imageKey);
  const fullUrl = pick.hotlink?.full ?? (await presignObject(imageKey));
  return { photo: { index, url, fullUrl, source, credit: pick.credit ?? null }, detect: () => storeHeads(runId, index, jpeg) };
};

/** The photo request a client sent, cleaned. */
export const parseAutoPhoto = (v: unknown): AutoPhotoRequest => {
  const r = (v ?? {}) as Record<string, unknown>;
  const text = (x: unknown, max: number) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  if (r.source === 'stock' && text(r.query, 80)) return { source: 'stock', query: text(r.query, 80), nth: Number.isInteger(r.nth) ? Math.max(0, r.nth as number) : 0 };
  if (r.source === 'ai' && text(r.scene, 400)) {
    const tone = Number.isInteger(r.tonePhoto) && (r.tonePhoto as number) >= 0 ? (r.tonePhoto as number) : undefined;
    return { source: 'ai', scene: text(r.scene, 400), ...(tone === undefined ? {} : { tonePhoto: tone }), ...(r.cta === true ? { cta: true } : {}) };
  }
  throw new HttpError(400, 'bad_auto_photo', 'Say what the photo shows.');
};

/**
 * Finds the photo's heads (the slide text keeps off them) and stores them on it, run after the import's response so
 * "Make" does not wait for it. A failed detection stores none: the text keeps its usual spot, and nothing retries.
 */
const storeHeads = async (runId: string, index: number, jpeg: Buffer): Promise<void> =>
  storeFoundHeads(runId, index, (await detectHeads(`data:image/jpeg;base64,${jpeg.toString('base64')}`)) ?? []);

/** Stores heads already found on campaign photo `index`. */
const storeFoundHeads = async (runId: string, index: number, heads: HeadBox[]): Promise<void> => {
  await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET photos = jsonb_set(photos, ARRAY[${String(index)}, 'heads'], ${JSON.stringify(heads)}::jsonb)
    WHERE id = ${runId} AND jsonb_array_length(photos) > ${index}`;
};
