// server-only — never import from a 'use client' file.
// The App shot builder's files, kept as user_uploads rows of their own kinds (never listed with the brand photos):
//   - app_screen: the app screenshots a workspace uploaded (the newest fills the builder next time);
//   - app_scene: backgrounds the person uploaded or had generated;
//   - app_shot: the finished images, offered in the picker's Generated tab and imported like any photo.

import { randomUUID } from 'node:crypto';
import { prisma } from '../../../../lib/db';
import { appShotPose } from '../../../../config/appShotPoses';
import type { AppShotAssetDto, AppShotBackground, AppShotRequest, CampaignCredit, PhotoOptionDto } from '../../../../types/admin/slideshowCampaign';
import { compressBrandPhoto } from '../../../brandContent/compressPhoto';
import { HttpError } from '../../../http';
import { createMeter } from '../../../metaAds/cost';
import { getObject, putObject } from '../../../storage/objectStore';
import { storeThumb, thumbUrl } from '../../../storage/thumbs';
import { generatePhoto, photoPrompt } from '../../photos';
import { fetchUnsplashPhoto, searchedUnsplashPhoto } from '../unsplash';
import { composeAppShot, composeHandShot, type LoadAsset } from './compose';
import { placeAppShot } from './relight';

export type AppAssetKind = 'app_screen' | 'app_scene';
const SHOT_KIND = 'app_shot';
/** Finished App shots the Generated tab offers. */
const SHOT_LIMIT = 60;

const save = async (workspaceId: string, kind: AppAssetKind | typeof SHOT_KIND, bytes: Buffer, filename: string, extra: { description?: string; descriptor?: object } = {}) => {
  const r2Key = `user-uploads/${workspaceId}/${kind}-${randomUUID()}.jpg`;
  await Promise.all([putObject(r2Key, bytes, 'image/jpeg'), storeThumb(r2Key, bytes)]);
  // Marked described: the brand photo describer has nothing to do with these.
  return prisma.userUpload.create({
    data: { workspaceId, r2Key, filename: filename.slice(0, 200), mimeType: 'image/jpeg', sizeBytes: bytes.length, kind, describeStatus: 'done', ...extra },
  });
};

const assetDto = (row: { id: string; r2Key: string }): AppShotAssetDto => ({ id: row.id, url: thumbUrl(row.r2Key) });

/** An uploaded screenshot or background, compressed like a brand photo. */
export const addAppAsset = async (workspaceId: string, kind: AppAssetKind, file: File): Promise<AppShotAssetDto> =>
  assetDto(await save(workspaceId, kind, await compressBrandPhoto(file), file.name || `${kind}.jpg`));

/** The workspace's newest app screenshot, to start the builder with. */
export const latestAppScreen = async (workspaceId: string): Promise<AppShotAssetDto | null> => {
  const row = await prisma.userUpload.findFirst({ where: { workspaceId, kind: 'app_screen', archivedAt: null }, orderBy: { createdAt: 'desc' } });
  return row ? assetDto(row) : null;
};

/** "Generate scene": an AI background of the scene. */
export const generateAppScene = async (workspaceId: string, scene: string): Promise<AppShotAssetDto> => {
  const { buffer } = await generatePhoto(photoPrompt(scene), [], createMeter()).catch((err: unknown) => {
    throw new HttpError(502, 'photo_failed', err instanceof Error ? `Scene failed: ${err.message.slice(0, 120)}` : 'Scene failed. Try again.');
  });
  return assetDto(await save(workspaceId, 'app_scene', buffer, 'scene.jpg', { description: scene }));
};

const ownBytes = async (workspaceId: string, kind: AppAssetKind, id: string): Promise<Buffer> => {
  const row = await prisma.userUpload.findFirst({ where: { id, workspaceId, kind, archivedAt: null } });
  const bytes = row ? await getObject(row.r2Key) : null;
  if (!bytes) throw new HttpError(404, 'asset_missing', kind === 'app_screen' ? 'Upload your app screen again.' : 'That background is gone. Pick another one.');
  return bytes;
};

/** The background's bytes: the scene picked (uploaded or generated), an Unsplash pick, or the top stock photo for the text. */
const backgroundOf = async (workspaceId: string, bg: AppShotBackground, scene: string): Promise<{ bytes: Buffer; credit: CampaignCredit | null }> => {
  if (bg?.source === 'scene') return { bytes: await ownBytes(workspaceId, 'app_scene', bg.id), credit: null };
  const photo = bg?.source === 'unsplash' ? await fetchUnsplashPhoto(bg.id) : await searchedUnsplashPhoto(scene, 0);
  return { bytes: photo.bytes, credit: photo.credit };
};

/**
 * The App shot: AI places the hand-held phone (screenshot warped onto the pose, plain background) in the background
 * photo. When the model fails (logged) it is the plain composite, so Build still gives an image.
 */
const shotImage = async (workspaceId: string, pose: NonNullable<ReturnType<typeof appShotPose>>, screen: Buffer, background: Buffer, scene: string, load: LoadAsset): Promise<Buffer> => {
  const hand = await composeHandShot(pose, screen, background, load);
  return placeAppShot(hand, background, scene, `user-uploads/${workspaceId}/app-shot-tmp`).catch(async (err: unknown) => {
    console.warn('[app-shot] AI step failed, keeping the composite:', err instanceof Error ? err.message : err);
    return composeAppShot(pose, screen, background, load);
  });
};

/** Builds the App shot (the hand-held phone placed in the background by AI) and keeps it; returns it as a picker
 *  option, ready to import. */
export const buildAppShot = async (workspaceId: string, req: AppShotRequest, load: LoadAsset): Promise<PhotoOptionDto> => {
  const pose = appShotPose(req.pose);
  if (!pose) throw new HttpError(400, 'bad_pose', 'Pick a pose.');
  const [screen, background] = await Promise.all([ownBytes(workspaceId, 'app_screen', req.screenId), backgroundOf(workspaceId, req.background, req.scene)]);
  const jpeg = await shotImage(workspaceId, pose, screen, background.bytes, req.scene, load);
  const label = `App shot${req.scene ? `: ${req.scene}` : ''}`;
  const row = await save(workspaceId, SHOT_KIND, jpeg, 'app-shot.jpg', { description: label, ...(background.credit ? { descriptor: { credit: background.credit } } : {}) });
  return shotOption(row);
};

type ShotRow = { id: string; r2Key: string; description: string | null; descriptor: unknown };

const creditOf = (descriptor: unknown): CampaignCredit | null => {
  const credit = (descriptor as { credit?: CampaignCredit } | null)?.credit;
  return credit && typeof credit.name === 'string' && typeof credit.url === 'string' ? credit : null;
};

const shotOption = (r: ShotRow): PhotoOptionDto => ({
  key: `app_shot:${r.id}`,
  thumbUrl: thumbUrl(r.r2Key),
  ref: { source: 'app_shot', id: r.id },
  label: r.description ?? 'App shot',
  credit: creditOf(r.descriptor),
});

/** The workspace's App shots, newest first (the top of the Generated tab). */
export const appShotOptions = async (workspaceId: string): Promise<PhotoOptionDto[]> => {
  const rows = await prisma.userUpload.findMany({
    where: { workspaceId, kind: SHOT_KIND, archivedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: SHOT_LIMIT,
    select: { id: true, r2Key: true, description: true, descriptor: true },
  });
  return rows.map(shotOption);
};

/** Removes an App shot from the workspace's lists (archived; slides it is already on keep their own copy). */
export const archiveAppShot = async (workspaceId: string, id: string): Promise<void> => {
  const { count } = await prisma.userUpload.updateMany({ where: { id, workspaceId, kind: SHOT_KIND, archivedAt: null }, data: { archivedAt: new Date() } });
  if (count === 0) throw new HttpError(404, 'photo_missing', 'That App shot is already gone.');
};

/** An App shot picked for import: its bytes and its background's Unsplash credit, if any. */
export const fetchAppShot = async (workspaceId: string, id: string): Promise<{ bytes: Buffer; label: string; credit?: CampaignCredit }> => {
  const row = await prisma.userUpload.findFirst({ where: { id, workspaceId, kind: SHOT_KIND, archivedAt: null } });
  const bytes = row ? await getObject(row.r2Key) : null;
  if (!row || !bytes) throw new HttpError(404, 'photo_missing', 'That photo is gone. Pick another one.');
  const credit = creditOf(row.descriptor);
  return { bytes, label: row.description ?? 'App shot', ...(credit ? { credit } : {}) };
};
