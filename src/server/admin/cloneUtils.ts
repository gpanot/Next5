/**
 * Clone utilities — shared between clone/upload and clone/source-from-url routes.
 *
 * Extracted from app/api/admin/ugc-lab/clone/upload/route.ts to avoid
 * duplicating the 150-line ffmpeg helpers in a second route.
 */

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';

// Resolve ffmpeg at runtime — avoids Next.js webpack bundling replacing
// ffmpeg-static's internal __dirname with /ROOT/ (ENOENT in route handlers).
// turbopackIgnore comments prevent Next.js static analysis from tracing the
// entire project just because we call existsSync on a runtime-resolved path.
export const FFMPEG_PATH = (() => {
  const p = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (existsSync(/*turbopackIgnore: true*/ p)) return p;
  for (const fallback of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
    if (existsSync(/*turbopackIgnore: true*/ fallback)) return fallback;
  }
  return null;
})();

const execFileAsync = promisify(execFile);

// ── R2 key conventions ────────────────────────────────────────────────────────

export const cloneKeys = {
  character: (stamp: string, ext: string) => `ugc-lab/clone/characters/${stamp}.${ext}`,
  video:     (stamp: string, ext: string) => `ugc-lab/clone/videos/${stamp}.${ext}`,
  frame:     (stamp: string)              => `ugc-lab/clone/frames/${stamp}.jpg`,
  voice:     (stamp: string, ext: string) => `ugc-lab/clone/voices/${stamp}.${ext}`,
};

// ── Video trimming ────────────────────────────────────────────────────────────

/**
 * Trim a video buffer to the first `durationSec` seconds.
 *
 * Strategy:
 *   1. Try stream copy (-c copy) — instant, no quality loss, works for H.264/AAC MP4.
 *   2. If copy fails (MOV/HEVC or incompatible codec), re-encode to H.264/AAC.
 *
 * Returns the trimmed Buffer on success, or null if both attempts fail.
 * Never silently falls back to the original — callers must handle null explicitly.
 */
export async function trimVideo(input: Buffer, durationSec: number): Promise<Buffer | null> {
  if (!FFMPEG_PATH) {
    console.error('[trimVideo] ffmpeg binary not found — cannot trim');
    return null;
  }

  const trimSec = Math.max(1, durationSec - 0.1);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const inPath  = path.join(tmpdir(), `clone-in-${stamp}`);
  const outPath = path.join(tmpdir(), `clone-out-${stamp}.mp4`);

  try {
    await writeFile(inPath, input);

    // ── Pass 1: stream copy ───────────────────────────────────────────────
    let copied = false;
    try {
      await execFileAsync(FFMPEG_PATH, [
        '-y', '-i', inPath,
        '-t', String(trimSec),
        '-c', 'copy',
        '-f', 'mp4', '-movflags', '+faststart',
        outPath,
      ]);
      copied = true;
    } catch (copyErr) {
      console.warn('[trimVideo] stream copy failed, falling back to re-encode:', (copyErr as Error).message?.split('\n')[0]);
    }

    // ── Pass 2: H.264 + AAC re-encode ────────────────────────────────────
    if (!copied) {
      try {
        await execFileAsync(FFMPEG_PATH, [
          '-y', '-i', inPath,
          '-t', String(trimSec),
          '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
          '-c:a', 'aac', '-b:a', '128k',
          '-f', 'mp4', '-movflags', '+faststart',
          outPath,
        ]);
      } catch (encodeErr) {
        console.error('[trimVideo] re-encode also failed:', (encodeErr as Error).message?.split('\n')[0]);
        return null;
      }
    }

    return await readFile(outPath);
  } catch (err) {
    console.error('[trimVideo] unexpected error:', err);
    return null;
  } finally {
    await Promise.all([
      unlink(inPath).catch(() => {}),
      unlink(outPath).catch(() => {}),
    ]);
  }
}

// ── First frame extraction ────────────────────────────────────────────────────

/**
 * Extract the first video frame as a JPEG for use as a first_frame scene reference.
 * Returns null if ffmpeg is unavailable or extraction fails.
 */
export async function extractFirstFrame(input: Buffer): Promise<Buffer | null> {
  if (!FFMPEG_PATH) return null;

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const inPath  = path.join(tmpdir(), `frame-in-${stamp}`);
  const outPath = path.join(tmpdir(), `frame-out-${stamp}.jpg`);

  try {
    await writeFile(inPath, input);
    await execFileAsync(FFMPEG_PATH, [
      '-y', '-i', inPath,
      '-vframes', '1',
      '-q:v', '2',
      outPath,
    ]);
    return await readFile(outPath);
  } catch (err) {
    console.warn('[extractFirstFrame] failed:', (err as Error).message?.split('\n')[0]);
    return null;
  } finally {
    await Promise.all([
      unlink(inPath).catch(() => {}),
      unlink(outPath).catch(() => {}),
    ]);
  }
}
