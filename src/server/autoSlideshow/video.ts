// server-only — never import from a 'use client' file.
// One slideshow as an MP4, made by the Blitz Slideshow render (blitz-worker, CAROUSEL template): each rendered slide
// JPEG is one shot, the slideshow's music plays from its best start. Renders are reused while nothing changed.
// Each tap is recorded in auto_slideshow_video_downloads (who, when, reused or not, how long the wait was) for stats.

import type { BlitzProject } from '@prisma/client';
import { prisma } from '../../lib/db';
import { getPresignedUrl } from '../../lib/r2';
import type { AutoSlide } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';

/** Seconds per slide: the editor preview's autoplay pace (SlidePreview SLIDE_MS). */
const SLIDE_SEC = 3;

export type SlideshowVideoDto = {
  projectId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  /** Signed link that saves the MP4, once COMPLETED. */
  downloadUrl: string | null;
  /** The stats row of this tap; the client sends it back while polling so the wait is closed when the MP4 is ready. */
  downloadId: string | null;
};

/** Who tapped: the run's workspace, and the user (null for an admin). */
export type VideoRequester = { workspaceId: string | null; userId: string | null };

type ShowRow = { id: string; topic: string; position: number; slides: unknown; audioAssetId: string | null; audioStart: number; audio: { r2Key: string } | null };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Bump when the render itself changes, so older MP4s are not reused (v2: workers before image-only slides made black videos). */
const RENDER_VERSION = 'v2';

/** What the video depends on: slide images, music and the render version. A change makes a new render. */
const fingerprint = (show: ShowRow, keys: string[]) => [RENDER_VERSION, ...keys, show.audioAssetId ?? '', show.audioStart].join('|');

const loadShow = async (runId: string, slideshowId: string): Promise<ShowRow> => {
  const show = await prisma.autoSlideshow.findFirst({ where: { id: slideshowId, runId }, include: { audio: { select: { r2Key: true } } } });
  if (!show) throw new HttpError(404, 'not_found', 'Slideshow not found');
  return show;
};

const slideKeys = (show: ShowRow): string[] => {
  const keys = (show.slides as AutoSlide[]).map((s) => s.imageKey);
  if (keys.length === 0 || keys.some((k) => !k)) throw new HttpError(409, 'not_rendered', 'Wait for every slide image to finish.');
  return keys as string[];
};

const toDto = async (project: BlitzProject, show: ShowRow, downloadId: string | null): Promise<SlideshowVideoDto> => ({
  projectId: project.id,
  downloadId,
  status: project.renderStatus,
  downloadUrl: project.renderStatus === 'COMPLETED' && project.renderedVideoKey
    ? await getPresignedUrl(project.renderedVideoKey, 3600, `${slug(show.topic) || 'slideshow'}-${show.position + 1}.mp4`)
    : null,
});

/** The latest render of this slideshow for its current fingerprint (failed ones are skipped so a tap retries). */
const findRender = (slideshowId: string, print: string) =>
  prisma.blitzProject.findFirst({
    where: {
      AND: [
        { currentAssets: { path: ['autoSlideshow', 'id'], equals: slideshowId } },
        { currentAssets: { path: ['autoSlideshow', 'fingerprint'], equals: print } },
      ],
      renderStatus: { not: 'FAILED' },
    },
    orderBy: { createdAt: 'desc' },
  });

const isDone = (status: BlitzProject['renderStatus']) => status === 'COMPLETED' || status === 'FAILED';

/** Closes a tap's stats row once its render is done; only a row of this render, still open, is changed. */
const finishDownload = async (downloadId: string, project: BlitzProject) => {
  const status = project.renderStatus;
  if (!isDone(status)) return;
  const where = { id: downloadId, projectId: project.id, status: 'rendering' };
  const row = await prisma.autoSlideshowVideoDownload.findFirst({ where, select: { requestedAt: true } });
  if (!row) return;
  const finishedAt = new Date();
  await prisma.autoSlideshowVideoDownload.updateMany({
    where,
    data: { status: status === 'COMPLETED' ? 'completed' : 'failed', finishedAt, waitMs: finishedAt.getTime() - row.requestedAt.getTime() },
  });
};

/** Records one tap; a reused render that is already done closes the row at once. */
const recordDownload = async (runId: string, slideshowId: string, project: BlitzProject, reused: boolean, who: VideoRequester): Promise<string> => {
  const row = await prisma.autoSlideshowVideoDownload.create({
    data: { slideshowId, runId, workspaceId: who.workspaceId, userId: who.userId, projectId: project.id, reused },
  });
  await finishDownload(row.id, project);
  return row.id;
};

const createRender = async (show: ShowRow, keys: string[], print: string, workspaceId: string | null): Promise<BlitzProject> => {
  const template = await prisma.blitzTemplate.findFirst({ where: { type: 'CAROUSEL' } });
  if (!template) throw new HttpError(500, 'no_template', 'No Slideshow render template found.');
  return prisma.blitzProject.create({
    data: {
      workspaceId,
      templateId: template.id,
      captionText: show.topic.slice(0, 200) || 'Slideshow',
      renderStatus: 'PENDING',
      currentAssets: {
        backgroundKey: keys[0]!,
        ...(show.audio ? { audioKey: show.audio.r2Key, audioStartAt: show.audioStart } : {}),
        durationSeconds: keys.length * SLIDE_SEC,
        // Text is already drawn on each slide JPEG: image-only shots, fitted whole inside the 9:16 frame.
        slides: keys.map((backgroundKey) => ({ text: '', backgroundKey, durationSec: SLIDE_SEC, fit: 'contain' })),
        autoSlideshow: { id: show.id, fingerprint: print },
      },
    },
  });
};

/** Starts (or reuses) the MP4 render of one slideshow, and records the tap. */
export const startSlideshowVideo = async (runId: string, slideshowId: string, who: VideoRequester): Promise<SlideshowVideoDto> => {
  const show = await loadShow(runId, slideshowId);
  const keys = slideKeys(show);
  const print = fingerprint(show, keys);
  const existing = await findRender(slideshowId, print);
  const project = existing ?? (await createRender(show, keys, print, who.workspaceId));
  const downloadId = await recordDownload(runId, slideshowId, project, existing !== null, who);
  return toDto(project, show, downloadId);
};

/** Status of one render started by startSlideshowVideo; closes the tap's stats row when the render is done. */
export const getSlideshowVideo = async (runId: string, slideshowId: string, projectId: string, downloadId: string | null): Promise<SlideshowVideoDto> => {
  const show = await loadShow(runId, slideshowId);
  const project = await prisma.blitzProject.findFirst({
    where: { id: projectId, currentAssets: { path: ['autoSlideshow', 'id'], equals: slideshowId } },
  });
  if (!project) throw new HttpError(404, 'not_found', 'Video not found');
  if (downloadId) await finishDownload(downloadId, project);
  return toDto(project, show, downloadId);
};
