/**
 * Listing videos (Brand create): render queued listing_videos rows with the realtor compositions.
 *
 * The app already did the slow, paid part (photo plan, script, voiceover in R2) and stored ready-to-render props.
 * Asset fields in props hold "r2:<key>"; they are signed here, right before rendering.
 * After the render, ffmpeg brings the mix to -14 LUFS (TikTok/Reels level), then the mp4 goes to R2.
 * Raw SQL throughout: the worker's Prisma schema is a subset of the app's.
 */

import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { renderMedia, selectComposition, type CancelSignal } from '@remotion/renderer';
import { prisma } from './db';
import { getPresignedUrl, uploadToR2 } from './r2';

const execFileAsync = promisify(execFile);

const COMPOSITIONS: Record<string, string> = { editorial: 'RealtorEditorialVoiced', rate: 'RealtorRateVoiced' };
const VIDEO_KEY = (id: string) => `listing-videos/${id}/video.mp4`;
const R2_PREFIX = 'r2:';
const STALE_AFTER = '2 minutes';

export type ListingVideoJob = { id: string; preset: string; props: unknown };

/** A rendering row with no heartbeat lost its worker: back in line. */
export async function requeueStaleListingVideos(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE listing_videos SET status = 'queued', updated_at = now() WHERE status = 'rendering' AND updated_at < now() - interval '${STALE_AFTER}'`,
  );
}

export async function claimNextListingVideo(): Promise<ListingVideoJob | null> {
  const rows = await prisma.$queryRaw<ListingVideoJob[]>`
    UPDATE listing_videos
    SET status = 'rendering', updated_at = now(), render_started_at = now(), render_finished_at = NULL
    WHERE id = (
      SELECT id FROM listing_videos WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING id, preset, props
  `;
  return rows[0] ?? null;
}

/** Deep copy of the props with every "r2:<key>" string replaced by a signed URL. */
async function signAssets(value: unknown): Promise<unknown> {
  if (typeof value === 'string') return value.startsWith(R2_PREFIX) ? getPresignedUrl(value.slice(R2_PREFIX.length), 2 * 3600) : value;
  if (Array.isArray(value)) return Promise.all(value.map(signAssets));
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await signAssets(v)] as const));
    return Object.fromEntries(entries);
  }
  return value;
}

const finish = (id: string, status: 'ready' | 'failed', fields: { videoKey?: string; error?: string }) =>
  prisma.$executeRaw`
    UPDATE listing_videos
    SET status = ${status}, video_key = ${fields.videoKey ?? null}, error = ${fields.error?.slice(0, 1_000) ?? null},
        render_finished_at = now(), updated_at = now()
    WHERE id = ${id}
  `;

async function renderOne(job: ListingVideoJob, serveUrl: string, tmpDir: string, cancelSignal: CancelSignal): Promise<string> {
  const composition = COMPOSITIONS[job.preset];
  if (!composition) throw new Error(`Unknown preset ${job.preset}`);
  const inputProps = (await signAssets(job.props)) as Record<string, unknown>;
  const chromiumOptions = { disableWebSecurity: true, gl: (process.platform === 'darwin' ? 'angle' : 'swangle') as 'angle' | 'swangle' };
  const browserExecutable = process.env.CHROMIUM_PATH || undefined;
  const comp = await selectComposition({ serveUrl, id: composition, inputProps, chromiumOptions, browserExecutable });
  const raw = path.join(tmpDir, 'raw.mp4');
  const out = path.join(tmpDir, 'video.mp4');
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: 'h264',
    outputLocation: raw,
    inputProps,
    cancelSignal,
    concurrency: Number(process.env.RENDER_CONCURRENCY ?? 2),
    timeoutInMilliseconds: 90_000,
    chromiumOptions,
    browserExecutable,
  });
  await execFileAsync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', out]);
  const key = VIDEO_KEY(job.id);
  await uploadToR2(out, key, 'video/mp4');
  return key;
}

/** Renders one claimed row; never throws (the row ends ready or failed). */
export async function processListingVideo(job: ListingVideoJob, serveUrl: string, cancelSignal: CancelSignal): Promise<void> {
  console.log(`[listing-video] Rendering ${job.id} (${job.preset})`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `listing_${job.id}_`));
  const heartbeat = setInterval(() => {
    prisma.$executeRaw`UPDATE listing_videos SET updated_at = now() WHERE id = ${job.id} AND status = 'rendering'`.catch(() => undefined);
  }, 30_000);
  try {
    const videoKey = await renderOne(job, serveUrl, tmpDir, cancelSignal);
    await finish(job.id, 'ready', { videoKey });
    console.log(`[listing-video] ${job.id} ready → ${videoKey}`);
  } catch (err) {
    console.error(`[listing-video] ${job.id} failed:`, err);
    await finish(job.id, 'failed', { error: err instanceof Error ? err.message : String(err) }).catch(() => undefined);
  } finally {
    clearInterval(heartbeat);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
