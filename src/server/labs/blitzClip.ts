// server-only — never import from a 'use client' file.
// Blitz clips re-encoded for rendering: H.264 with a keyframe every second, at most 1080 wide, faststart.
// Remotion reads a clip frame by frame; a clip with one keyframe and a high bitrate makes each frame decode from the
// start of the file, and the render stalls (seen 2026-10-19: "Video 203", 18 Mbps, 1 keyframe in 121 frames, timed out
// at 88 s on every try). Uploads go through this once, so every render reads a light clip.

import { readFile } from 'fs/promises';
import path from 'path';
import { getPresignedUrl, uploadToR2 } from '../../lib/r2';
import { ffmpeg, withTempDir } from '../shorts/ffmpeg';

/** Clips this re-encodes in place; other video formats are left as uploaded. */
const MP4_KEY = /\.(mp4|m4v)$/i;

export const isMp4Key = (key: string): boolean => MP4_KEY.test(key);

/** The ffmpeg arguments, shared with scripts/normalize-blitz-clips.ts. */
export const clipArgs = (input: string, output: string): string[] => [
  '-i', input,
  '-map', '0:v:0', '-map', '0:a:0?',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
  // One keyframe per second whatever the frame rate; no scene-cut keyframes in between needed.
  '-force_key_frames', 'expr:gte(t,n_forced*1)',
  '-vf', "scale='min(1080,iw)':-2",
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  output,
];

/** Re-encodes the clip at `key` and writes it back to the same key. Throws when ffmpeg fails. */
export const normalizeClip = async (key: string): Promise<void> => {
  const url = await getPresignedUrl(key, 900);
  if (!url) throw new Error('R2 is not configured');
  const mp4 = await withTempDir(async (dir) => {
    const output = path.join(dir, 'clip.mp4');
    await ffmpeg(clipArgs(url, output), 120_000);
    return readFile(output);
  });
  await uploadToR2(key, mp4, 'video/mp4');
};
