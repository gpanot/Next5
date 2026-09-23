/**
 * Blitz Worker — make an overlay asset decodable by headless Chrome.
 *
 * The overlay is drawn with <Video> from @remotion/media because colorKey()
 * only runs on that component. <Video> decodes through WebCodecs in the
 * browser, which supports a narrower codec set than ffmpeg: an iPhone HEVC
 * clip decodes fine on a Mac but not in a Linux container. When the decode
 * fails, Remotion falls back to <OffthreadVideo>, which drops the effect and
 * leaves the green background in the output.
 *
 * So before rendering we transcode any non-WebCodecs codec to H.264 / yuv420p
 * and cache the result in R2, keyed by the original object key. Assets that are
 * already safe are passed through untouched — no re-encode, no quality loss.
 */

import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { downloadFromR2, objectExists, uploadToR2 } from './r2';

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

/** Codecs Chrome can decode through WebCodecs on every platform we render on. */
const WEBCODECS_SAFE_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1']);

/** Pixel formats the WebCodecs path handles; 10-bit variants are not included. */
const WEBCODECS_SAFE_PIX_FMTS = new Set(['yuv420p', 'yuvj420p']);

/** Where the transcoded copy of an asset lives. */
const cacheKeyFor = (key: string) =>
  `blitz/assets-h264/${path.basename(key, path.extname(key))}.mp4`;

type VideoStreamInfo = { codecName: string; pixFmt: string };

/** Reads codec + pixel format of the first video stream. */
async function probeVideoStream(localPath: string): Promise<VideoStreamInfo> {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,pix_fmt',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    localPath,
  ]);
  const [codecName = '', pixFmt = ''] = stdout.trim().split('\n');
  return { codecName, pixFmt };
}

/** True when headless Chrome can decode the file through WebCodecs. */
function isBrowserDecodable({ codecName, pixFmt }: VideoStreamInfo): boolean {
  return WEBCODECS_SAFE_CODECS.has(codecName) && WEBCODECS_SAFE_PIX_FMTS.has(pixFmt);
}

/** Re-encodes to H.264 / yuv420p, keeping the audio track as AAC. */
async function transcodeToH264(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync(FFMPEG, [
    '-y',
    '-i', inputPath,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-preset', 'veryfast',
    '-crf', '18',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath,
  ], { maxBuffer: 1024 * 1024 * 16 });
}

/**
 * Returns the R2 key to render with: the original one when it is already
 * browser-decodable, otherwise a cached H.264 copy (created on first use).
 *
 * `workDir` must exist; the temp files written into it are the caller's to
 * clean up.
 */
export async function ensureBrowserDecodableKey(
  key: string,
  workDir: string,
  log: (message: string) => void = () => undefined,
): Promise<string> {
  const cacheKey = cacheKeyFor(key);
  if (await objectExists(cacheKey)) {
    log(`Using cached H.264 overlay: ${cacheKey}`);
    return cacheKey;
  }

  const sourcePath = path.join(workDir, `source${path.extname(key) || '.mp4'}`);
  await downloadFromR2(key, sourcePath);

  const stream = await probeVideoStream(sourcePath);
  if (isBrowserDecodable(stream)) {
    fs.rmSync(sourcePath, { force: true });
    return key;
  }

  log(`Overlay is ${stream.codecName}/${stream.pixFmt} — transcoding to H.264…`);
  const transcodedPath = path.join(workDir, 'overlay-h264.mp4');
  await transcodeToH264(sourcePath, transcodedPath);
  await uploadToR2(transcodedPath, cacheKey, 'video/mp4');
  fs.rmSync(sourcePath, { force: true });
  log(`Cached H.264 overlay at ${cacheKey}`);
  return cacheKey;
}
