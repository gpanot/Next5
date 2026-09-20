import { execFile } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';
import { NextResponse, type NextRequest } from 'next/server';
import ffmpegPath from 'ffmpeg-static';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { browserUrl, putFile, uniqueStamp, vendorUrl } from '../../../../../../src/server/admin/ugcStore';

// Videos can be up to 200 MB — give the upload route 5 minutes to receive, trim, and store
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

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
async function trimVideo(input: Buffer, durationSec: number): Promise<Buffer | null> {
  if (!ffmpegPath) {
    console.error('[trimVideo] ffmpeg-static path is null — cannot trim');
    return null;
  }

  // Subtract a small safety margin so Kling's duration check always passes
  const trimSec = Math.max(1, durationSec - 0.1);

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  // No extension on input — ffmpeg reads the container header, not the filename
  const inPath  = path.join(tmpdir(), `clone-in-${stamp}`);
  const outPath = path.join(tmpdir(), `clone-out-${stamp}.mp4`);

  try {
    await writeFile(inPath, input);

    // ── Pass 1: stream copy (fast, no re-encode) ──────────────────────────
    let copied = false;
    try {
      await execFileAsync(ffmpegPath, [
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

    // ── Pass 2: H.264 + AAC re-encode (handles MOV/HEVC and any input) ───
    if (!copied) {
      try {
        await execFileAsync(ffmpegPath, [
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

const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg',  'jpg'],
  ['image/png',  'png'],
  ['image/webp', 'webp'],
]);

const AUDIO_TYPES = new Map([
  ['audio/mpeg',  'mp3'],
  ['audio/mp3',   'mp3'],
  ['audio/wav',   'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/wave',  'wav'],
  ['audio/mp4',   'm4a'],
  ['audio/m4a',   'm4a'],
  ['audio/x-m4a', 'm4a'],
  ['audio/aac',   'aac'],
]);

const VIDEO_TYPES = new Map([
  ['video/mp4',       'mp4'],
  ['video/quicktime', 'mov'],
]);

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;  // 12 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;  // 10 MB

const cloneKeys = {
  character: (stamp: string, ext: string) => `ugc-lab/clone/characters/${stamp}.${ext}`,
  video:     (stamp: string, ext: string) => `ugc-lab/clone/videos/${stamp}.${ext}`,
  voice:     (stamp: string, ext: string) => `ugc-lab/clone/voices/${stamp}.${ext}`,
};

/**
 * POST multipart: file + purpose ("character" | "video" | "voice")
 *
 * character → JPEG/PNG/WebP image stored in R2; returns { key, vendorUrl } (7-day link for Poyo)
 * video     → MP4/MOV reference video stored in R2; returns { key, vendorUrl } (7-day link for Poyo)
 * voice     → MP3/WAV/M4A/AAC audio stored in R2; returns { key, voiceUrl } (24-hr browser link)
 */
export const POST = adminRoute(async (req: NextRequest) => {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const purpose = formData.get('purpose') as string | null;
  const stamp = uniqueStamp();

  if (purpose === 'character') {
    const ext = IMAGE_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images accepted' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is larger than 12 MB' }, { status: 413 });
    }
    const key = cloneKeys.character(stamp, ext);
    await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
    const url = await vendorUrl(key);
    return NextResponse.json({ key, vendorUrl: url });
  }

  if (purpose === 'video') {
    const ext = VIDEO_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Only MP4 or MOV videos accepted' }, { status: 400 });
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video is larger than 200 MB' }, { status: 413 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let videoBuffer: Buffer = Buffer.from(await file.arrayBuffer() as any);

    // Trim to the requested max duration if provided (always output as mp4 after trim)
    const maxDurationRaw = formData.get('maxDuration');
    const maxDurationSec = maxDurationRaw ? Number(maxDurationRaw) : null;
    let trimmed = false;
    if (maxDurationSec && maxDurationSec > 0) {
      const trimmedBuffer = await trimVideo(videoBuffer, maxDurationSec);
      if (trimmedBuffer === null) {
        // Both stream-copy and re-encode failed — refuse upload rather than sending an untrimmed video
        return NextResponse.json({
          error: `Could not trim the video to ${maxDurationSec} s. Please upload a clip that is already shorter.`,
        }, { status: 422 });
      }
      videoBuffer = trimmedBuffer;
      trimmed = true;
    }

    // Always store as mp4 (trimVideo outputs mp4; original may be mov)
    const storeExt = trimmed ? 'mp4' : ext;
    const storeType = trimmed ? 'video/mp4' : file.type;
    const key = cloneKeys.video(stamp, storeExt);
    await putFile(key, videoBuffer, storeType);
    const url = await vendorUrl(key);
    return NextResponse.json({ key, vendorUrl: url, trimmed });
  }

  if (purpose === 'voice') {
    const ext = AUDIO_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Only MP3, WAV, M4A, or AAC audio accepted' }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file is larger than 10 MB' }, { status: 413 });
    }
    const key = cloneKeys.voice(stamp, ext);
    await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
    const voiceUrl = await browserUrl(key);
    return NextResponse.json({ key, voiceUrl });
  }

  return NextResponse.json({ error: 'purpose must be "character", "video", or "voice"' }, { status: 400 });
});
