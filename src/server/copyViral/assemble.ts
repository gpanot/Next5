// server-only — never import from a 'use client' file.
// Guillaume's takes joined in shot order into one take for the engine: each clip tone-mapped to SDR when it is iPhone
// HDR (Apple's avconvert, as the engine does), filled to the output size, 30 fps, 48 kHz stereo, then concatenated.
// Returns where each shot starts and ends in the joined take, in seconds: the spec builder times everything on it.

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { promisify } from 'util';
import type { CopyViralResolution, CopyViralShot } from '../../types/admin/copyViral';
import { probeVideo } from './media';
import { projectFile } from './store';

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';
const HDR = new Set(['arib-std-b67', 'smpte2084']);

export type ShotSpan = { index: number; from: number; to: number };

const ff = (args: string[]) => execFileAsync(FFMPEG, ['-y', '-v', 'error', ...args], { timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });

const colorTransfer = async (file: string) =>
  (await execFileAsync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer', '-of', 'default=nw=1:nk=1', file])).stdout.trim();

/** An HDR iPhone clip as SDR BT.709 (same look as the iPhone's own SDR export); other clips unchanged. */
const toSdr = async (file: string, out: string): Promise<string> => {
  if (!HDR.has(await colorTransfer(file))) return file;
  if (process.platform !== 'darwin') throw new Error('An HDR clip needs macOS (avconvert) to convert to SDR');
  await execFileAsync('avconvert', ['-s', file, '-o', out, '-p', 'Preset1920x1080', '--replace'], { timeout: 600_000 });
  return out;
};

/**
 * Fills the frame (crop, never bars), 30 fps, SDR BT.709, AAC 48 kHz stereo; silent audio when the clip has none.
 * `fit` keeps the whole picture instead (scaled to the width, bars above and below): a landscape take of a split shot,
 * whose camera card is wide, so it is not cropped twice (to 9:16, then to the card) into a giant face.
 */
const normalize = async (file: string, out: string, resolution: CopyViralResolution, fit: boolean) => {
  const [w, h] = resolution.split('x');
  const hasAudio = (await probeVideo(file)).hasAudio;
  const frame = fit
    ? `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`
    : `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
  const vf = `${frame},setsar=1,fps=30,format=yuv420p`;
  await ff([
    '-i', file, ...(hasAudio ? [] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']),
    '-map', '0:v:0', '-map', hasAudio ? '0:a:0' : '1:a:0', '-shortest',
    '-vf', vf, '-c:v', 'libx264', '-preset', 'fast', '-crf', '16',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', out,
  ]);
};

/** A landscape take of a split shot (camera in a wide card under the paper), with no picture behind me. */
export const keepsWholePicture = (shot: CopyViralShot) =>
  shot.reading?.layout === 'split' && !shot.background && !!shot.clip && shot.clip.width > shot.clip.height;

/** Joins every shot's clip into `out`. Throws when a shot has no take yet. */
export const assembleTake = async (id: string, shots: CopyViralShot[], resolution: CopyViralResolution, out: string): Promise<ShotSpan[]> => {
  const missing = shots.filter((s) => !s.clip).map((s) => s.index + 1);
  if (missing.length) throw new Error(`Upload a take for shot ${missing.join(', ')} first`);
  // next to the output, so a sequence preview and the full edit can join at the same time
  const dir = `${out.replace(/\.mp4$/, '')}-work`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const parts: string[] = [];
  const spans: ShotSpan[] = [];
  let t = 0;
  for (const shot of shots) {
    const clip = projectFile(id, shot.clip?.file ?? '');
    if (!existsSync(clip)) throw new Error(`The take of shot ${shot.index + 1} is missing on disk: upload it again`);
    const part = `${dir}/part-${shot.index + 1}.mp4`;
    await normalize(await toSdr(clip, `${dir}/sdr-${shot.index + 1}.mov`), part, resolution, keepsWholePicture(shot));
    const durS = (await probeVideo(part)).durationMs / 1000;
    spans.push({ index: shot.index, from: t, to: t + durS });
    t += durS;
    parts.push(part);
  }
  await writeFile(`${dir}/parts.txt`, parts.map((p) => `file '${p}'`).join('\n'));
  await ff(['-f', 'concat', '-safe', '0', '-i', `${dir}/parts.txt`, '-c', 'copy', '-movflags', '+faststart', out]);
  await rm(dir, { recursive: true, force: true });
  return spans;
};
