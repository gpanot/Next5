// server-only — never import from a 'use client' file.
// A Blitz clip's cover picture: its first frame as a small JPEG, made once with ffmpeg and kept in R2 next to the clips.
// Calendar tiles and rows show this instead of loading the start of each video every time they mount.

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { getObjectBuffer, getPresignedUrl, uploadToR2 } from '../../lib/r2';
import { ffmpeg, withTempDir } from '../shorts/ffmpeg';

/** Clips the poster route accepts: under blitz/ (as the proxy), a video file, no path tricks. */
const VIDEO_KEY = /^blitz\/[^\0]+\.(mp4|mov|webm|m4v)$/i;
/** Sharp on a phone tile or row (3x screens), small enough to load at once. */
const POSTER_WIDTH = 360;
/** Just past the start, as the old `#t=0.1` cover did (some clips open on a black frame). */
const FRAME_AT_SEC = 0.1;

export const isBlitzVideoKey = (key: string): boolean => VIDEO_KEY.test(key) && !key.includes('..');

/** Same clip, same poster: the key is a hash of the clip's key. */
const posterKeyOf = (videoKey: string) => `blitz/posters/${createHash('sha1').update(videoKey).digest('hex').slice(0, 24)}.jpg`;

/** The first frame, read straight from R2 over HTTP (ffmpeg fetches only the start of the file). */
const grabFrame = async (videoKey: string): Promise<Buffer | null> => {
  const url = await getPresignedUrl(videoKey, 600);
  if (!url) return null;
  return withTempDir(async (dir) => {
    const output = path.join(dir, 'poster.jpg');
    await ffmpeg(['-ss', String(FRAME_AT_SEC), '-i', url, '-frames:v', '1', '-vf', `scale=${POSTER_WIDTH}:-2`, '-q:v', '4', output], 60_000);
    return readFile(output).catch(() => null);
  });
};

/** Posters being made right now, so tiles asking at once share one ffmpeg run. */
const pending = new Map<string, Promise<Buffer | null>>();

const makePoster = async (videoKey: string, posterKey: string): Promise<Buffer | null> => {
  const jpg = await grabFrame(videoKey);
  if (jpg && jpg.length > 0) await uploadToR2(posterKey, jpg, 'image/jpeg');
  return jpg && jpg.length > 0 ? jpg : null;
};

/** The clip's poster JPEG: the stored one, else made now and stored. Null when the clip is missing or unreadable. */
export const blitzPoster = async (videoKey: string): Promise<Buffer | null> => {
  const posterKey = posterKeyOf(videoKey);
  const stored = await getObjectBuffer(posterKey);
  if (stored) return stored;
  const running = pending.get(posterKey);
  if (running) return running;
  const job = makePoster(videoKey, posterKey).finally(() => pending.delete(posterKey));
  pending.set(posterKey, job);
  return job;
};
