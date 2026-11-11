// server-only — never import from a 'use client' file.
// Guillaume's take of one shot: streamed to disk, probed, checked. A retake replaces the file; other shots stay as they are.

import { execFile } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { promisify } from 'util';
import { HttpError } from '../http';
import type { CopyViralClip, CopyViralShot } from '../../types/admin/copyViral';
import { probeVideo, type VideoProbe } from './media';
import { mutateProject, projectFile } from './store';

const execFileAsync = promisify(execFile);

const EXTENSIONS: Record<string, string> = { 'video/quicktime': 'mov', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/x-m4v': 'm4v' };

/** Never blocking: the card shows them so Guillaume can retake before the edit. */
export const clipWarnings = (probe: VideoProbe, targetMs: number): string[] => {
  const warnings: string[] = [];
  // the edit keeps the middle 9:16 of the frame: a landscape webcam gives a narrow, low resolution crop
  const keptW = Math.min(probe.width, Math.round((probe.height * 9) / 16));
  if (probe.width > probe.height) warnings.push(`Landscape: the middle 9:16 is kept (${keptW}×${probe.height})`);
  if (keptW < 1080) warnings.push(`Low resolution for 1080×1920 (${keptW} px wide kept): a phone or camera held vertical is sharper`);
  if (probe.durationMs < targetMs * 0.8) warnings.push(`Shorter than the target (${(probe.durationMs / 1000).toFixed(1)} s vs ${(targetMs / 1000).toFixed(1)} s)`);
  if (!probe.hasAudio) warnings.push('No sound in this clip');
  return warnings;
};

/**
 * A browser recording in WebM has no duration in its header and VP9 the engine's tools read slowly: re-encode it to
 * an H.264 MP4 once (fast preset, near lossless), then drop the WebM.
 */
const webmToMp4 = async (id: string, file: string) => {
  const out = file.replace(/\.webm$/, '.mp4');
  await execFileAsync(process.env.FFMPEG_PATH ?? 'ffmpeg', [
    '-y', '-v', 'error', '-i', projectFile(id, file), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-r', '30', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', projectFile(id, out),
  ], { timeout: 600_000 });
  await rm(projectFile(id, file), { force: true });
  return out;
};

const findShot = (shots: CopyViralShot[], index: number, startMs: number) => {
  const shot = shots[index];
  if (!shot || shot.startMs !== startMs) throw new HttpError(409, 'shots_changed', 'The shots changed: reload the page');
  return shot;
};

/** Saves the request body as the shot's clip, replacing any earlier take. */
export const saveClip = async (id: string, index: number, startMs: number, contentType: string, body: ReadableStream<Uint8Array>) => {
  await mkdir(projectFile(id, 'clips'), { recursive: true });
  let file = `clips/shot-${index + 1}-${Date.now()}.${EXTENSIONS[contentType.split(';')[0]] ?? 'mp4'}`;
  await pipeline(Readable.fromWeb(body as WebReadableStream<Uint8Array>), createWriteStream(projectFile(id, file)));
  let probe: VideoProbe;
  try {
    if (file.endsWith('.webm')) file = await webmToMp4(id, file);
    probe = await probeVideo(projectFile(id, file));
  } catch {
    await rm(projectFile(id, file), { force: true });
    throw new HttpError(400, 'not_a_video', 'This file is not a video we can read');
  }
  let old: string | null = null;
  const project = await mutateProject(id, (p) => {
    const shot = findShot(p.shots, index, startMs);
    old = shot.clip?.file ?? null;
    const clip: CopyViralClip = {
      file, durationMs: probe.durationMs, width: probe.width, height: probe.height, fps: probe.fps,
      uploadedAt: new Date().toISOString(), warnings: clipWarnings(probe, shot.targetMs),
    };
    return { ...p, shots: p.shots.map((s, i) => (i === index ? { ...s, clip } : s)) };
  }).catch(async (err: unknown) => {
    await rm(projectFile(id, file), { force: true });
    throw err;
  });
  if (old) await rm(projectFile(id, old), { force: true });
  return project;
};

export const removeClip = async (id: string, index: number, startMs: number) => {
  let old: string | null = null;
  const project = await mutateProject(id, (p) => {
    old = findShot(p.shots, index, startMs).clip?.file ?? null;
    return { ...p, shots: p.shots.map((s, i) => (i === index ? { ...s, clip: null } : s)) };
  });
  if (old) await rm(projectFile(id, old), { force: true });
  return project;
};
