// server-only — never import from a 'use client' file.
// The Short's thumbnail: the frame at 2 seconds, where the hook is usually on screen. Set after the upload with
// thumbnails.set (allowed by the youtube.upload scope). Custom thumbnails need a verified channel, so a refusal is
// logged and the post carries on with YouTube's own pick.
// Docs: developers.google.com/youtube/v3/docs/thumbnails/set

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { ffmpeg, withTempDir } from '../shorts/ffmpeg';

const SET = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set';
/** Where the hook usually shows. */
export const THUMBNAIL_AT_SEC = 2;
/** YouTube's limit for a thumbnail file. */
const MAX_BYTES = 2 * 1024 * 1024;

/** One JPEG frame at `atSec` (the first frame when the video is shorter), at most 2 MB. */
export const frameAt = (video: Buffer, atSec = THUMBNAIL_AT_SEC): Promise<Buffer> =>
  withTempDir(async (dir) => {
    const input = path.join(dir, 'in.mp4');
    const output = path.join(dir, 'thumb.jpg');
    await writeFile(input, video);
    const grab = (sec: number, width: number) => ffmpeg(['-ss', String(sec), '-i', input, '-frames:v', '1', '-vf', `scale=${width}:-2`, '-q:v', '3', output], 60_000);
    let sec = atSec;
    await grab(sec, 1080).catch(() => undefined);
    let jpg = await readFile(output).catch(() => Buffer.alloc(0));
    // Shorter than `atSec`: ffmpeg writes nothing, so take the first frame.
    if (jpg.length === 0) {
      sec = 0;
      await grab(sec, 1080);
      jpg = await readFile(output);
    }
    if (jpg.length > MAX_BYTES) {
      await grab(sec, 720);
      jpg = await readFile(output);
    }
    return jpg;
  });

/** Sets the frame at 2 s as the video's thumbnail. Never throws: a missing thumbnail must not fail the post. */
export const setThumbnailFromVideo = async (accessToken: string, videoId: string, video: Buffer): Promise<boolean> => {
  try {
    const jpg = await frameAt(video);
    const res = await fetch(`${SET}?videoId=${encodeURIComponent(videoId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg', 'Content-Length': String(jpg.length) },
      body: new Uint8Array(jpg),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[social:youtube] thumbnail for ${videoId} refused`, res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[social:youtube] thumbnail for ${videoId} skipped:`, err instanceof Error ? err.message : err);
    return false;
  }
};
