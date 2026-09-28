// server-only — never import from a 'use client' file.
// Video ad for one generated ad: script → avatar → Wan 3.0 (9:16, 480p, avatar as character reference).
// A variation reuses its version's script and avatar and only re-films.
// Each step saves its output on the video row. Wan can take minutes, so the task id is stored and the video is also
// finished by `advanceVideo` whenever the page asks for it — the background job does not have to outlive it.

import type { MetaAd, MetaAdVideo } from '@prisma/client';
import type { BrandProfile, VideoScript } from '../../../types/admin/metaAds';
import { prisma } from '../../../lib/db';
import { checkWan3Task, submitWan3Task } from '../../admin/wan3Provider';
import { presignObject, putObject } from '../../storage/objectStore';
import { createMeter } from '../cost';
import { getRunDto } from '../store';
import { clip } from '../text';
import { avatarKey, avatarPrompt, generateAvatar } from './avatar';
import { composeVideoPrompt, writeVideoScript } from './script';

/** reAPI Wan 3.0 at 480P, per second (checked 2026-09-28). Used only when the task does not report its credits. */
const WAN_480P_MICROS_PER_SECOND = 36_000;
const POLL_MS = 5_000;
/** How long the background job keeps polling; after that the page's polls finish the video. */
const BACKGROUND_POLL_MS = 200_000;

export const videoKey = (runId: string, videoId: string) => `admin/meta-ads/${runId}/videos/${videoId}.mp4`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fail = (id: string, err: unknown) =>
  prisma.metaAdVideo.update({ where: { id }, data: { status: 'failed', error: clip(err instanceof Error ? err.message : String(err), 500) } });

/**
 * Checks the Wan task once; when done, stores the MP4 and marks the video ready. Safe to call from several polls at
 * once: only the call that moves the row out of 'video' records the cost.
 */
export const advanceVideo = async (video: MetaAdVideo): Promise<void> => {
  if (video.status !== 'video' || !video.videoTaskId) return;
  const task = await checkWan3Task(video.videoTaskId);
  if (task.state === 'generating') return;
  if (task.state === 'failed' || !task.videoUrl) {
    await prisma.metaAdVideo.updateMany({ where: { id: video.id, status: 'video' }, data: { status: 'failed', error: clip(task.error ?? 'Wan 3.0 failed', 500) } });
    return;
  }
  const res = await fetch(task.videoUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Could not download the video (${res.status})`);
  const key = videoKey(video.runId, video.id);
  await putObject(key, Buffer.from(await res.arrayBuffer()), 'video/mp4');
  const cost = task.costMicros ?? WAN_480P_MICROS_PER_SECOND * video.duration;
  await prisma.metaAdVideo.updateMany({ where: { id: video.id, status: 'video' }, data: { status: 'ready', videoKey: key, costMicros: video.costMicros + cost } });
};

type VideoWithAd = MetaAdVideo & { ad: MetaAd };
type Meter = ReturnType<typeof createMeter>;

/** Steps 1-2: script, then avatar. A variation already has both (copied from its version), so this is skipped. */
const scriptAndAvatar = async (video: VideoWithAd, meter: Meter): Promise<{ script: VideoScript; avatarKey: string }> => {
  if (video.script && video.avatarKey) return { script: video.script as unknown as VideoScript, avatarKey: video.avatarKey };
  const run = await getRunDto(video.runId);
  if (!run?.profile) throw new Error('The run has no brand profile');
  const script = await writeVideoScript(run.profile as BrandProfile, run, video.ad, video.duration, meter);
  const prompt = avatarPrompt(script.persona);
  await prisma.metaAdVideo.update({ where: { id: video.id }, data: { status: 'avatar', script, avatarPrompt: prompt, costMicros: meter.summary().usdMicros } });
  return { script, avatarKey: await generateAvatar(prompt, avatarKey(video.runId, video.id), meter) };
};

/** Runs the three steps for one video row (only the filming for a variation). Never throws: failures land on the row. */
export const generateVideoAd = async (videoId: string): Promise<void> => {
  const meter = createMeter();
  try {
    const video = await prisma.metaAdVideo.findUniqueOrThrow({ where: { id: videoId }, include: { ad: true } });
    const { script, avatarKey: key } = await scriptAndAvatar(video, meter);
    const avatarUrl = await presignObject(key, 6 * 60 * 60);
    if (!avatarUrl?.startsWith('https://')) throw new Error('The avatar needs a public HTTPS URL for Wan 3.0 (set NEXT5_STORAGE=r2)');

    const videoPrompt = composeVideoPrompt(script);
    const taskId = await submitWan3Task({ prompt: videoPrompt, imageUrl: avatarUrl, duration: video.duration, resolution: '480p', imageRole: 'reference_image' });
    const filming = await prisma.metaAdVideo.update({
      where: { id: videoId },
      data: { status: 'video', avatarKey: key, videoPrompt, videoTaskId: taskId, costMicros: meter.summary().usdMicros },
    });

    const deadline = Date.now() + BACKGROUND_POLL_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      await advanceVideo(filming);
      const now = await prisma.metaAdVideo.findUnique({ where: { id: videoId }, select: { status: true } });
      if (now?.status !== 'video') return;
    }
  } catch (err) {
    console.error(`[meta-ads] video ${videoId} failed:`, err instanceof Error ? err.message : err);
    await fail(videoId, err).catch(() => undefined);
  }
};
