// server-only — never import from a 'use client' file.
// ffmpeg/ffprobe for Copy Viral Post. Uses the system binaries (Homebrew): the feature runs on localhost only,
// and scdet needs a recent ffmpeg.

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';
const BUFFER = 32 * 1024 * 1024;

export type VideoProbe = { durationMs: number; width: number; height: number; fps: number; hasAudio: boolean };

type ProbeStream = { codec_type?: string; width?: number; height?: number; avg_frame_rate?: string; side_data_list?: { rotation?: number }[] };

const parseRate = (rate = '0/1') => {
  const [n, d] = rate.split('/').map(Number);
  return d ? Math.round((n / d) * 100) / 100 : 0;
};

export const probeVideo = async (file: string): Promise<VideoProbe> => {
  const { stdout } = await execFileAsync(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { maxBuffer: BUFFER });
  const info = JSON.parse(stdout) as { format?: { duration?: string }; streams?: ProbeStream[] };
  const video = info.streams?.find((s) => s.codec_type === 'video');
  if (!video) throw new Error('No video stream in this file');
  // Phone clips store portrait as landscape + a rotation: report what the viewer sees.
  const rotated = Math.abs(video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0) === 90;
  return {
    durationMs: Math.round(parseFloat(info.format?.duration ?? '0') * 1000),
    width: (rotated ? video.height : video.width) ?? 0,
    height: (rotated ? video.width : video.height) ?? 0,
    fps: parseRate(video.avg_frame_rate),
    hasAudio: !!info.streams?.some((s) => s.codec_type === 'audio'),
  };
};

/** Hard cuts, in seconds. The /steal skill uses threshold 12; same-room camera changes need lower. */
export const detectCuts = async (file: string, threshold: number): Promise<number[]> => {
  const { stderr } = await execFileAsync(FFMPEG, ['-hide_banner', '-i', file, '-vf', `scdet=threshold=${threshold}`, '-an', '-f', 'null', '-'], { maxBuffer: BUFFER, timeout: 300_000 });
  return [...stderr.matchAll(/scd\.time: ([0-9.]+)/g)].map((m) => parseFloat(m[1])).filter(Number.isFinite);
};

/** One still at `ms`, `width` px wide, as JPEG. */
export const extractFrame = async (file: string, ms: number, out: string, width = 540): Promise<void> => {
  await execFileAsync(FFMPEG, ['-y', '-v', 'error', '-ss', (ms / 1000).toFixed(3), '-i', file, '-frames:v', '1', '-vf', `scale=${width}:-2`, '-q:v', '3', out], { timeout: 60_000 });
};
