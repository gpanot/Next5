// server-only — never import from a 'use client' file.
// ffmpeg for Shorts: the ffmpeg-static binary (built with libass, so ASS captions burn in), WAV helpers, temp dirs.

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Resolved at runtime so Next.js does not rewrite ffmpeg-static's __dirname (see admin/cloneUtils.ts). */
const ffmpegPath = (): string => {
  const bundled = path.join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  for (const p of [bundled, '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg']) {
    if (existsSync(/*turbopackIgnore: true*/ p)) return p;
  }
  throw new Error('ffmpeg binary not found (expected node_modules/ffmpeg-static/ffmpeg)');
};

/** Montserrat Bold for the burned-in captions, shipped in the repo (assets/fonts). */
export const fontDir = (): string => path.join(/*turbopackIgnore: true*/ process.cwd(), 'assets', 'fonts');

export const ffmpeg = async (args: string[], timeoutMs = 240_000): Promise<void> => {
  try {
    await execFileAsync(ffmpegPath(), ['-y', '-hide_banner', '-loglevel', 'error', ...args], { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? '';
    throw new Error(`ffmpeg failed: ${stderr.slice(-800) || (err instanceof Error ? err.message : String(err))}`);
  }
};

/** A temp dir for one job, removed when `fn` settles. */
export const withTempDir = async <T>(fn: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(path.join(tmpdir(), 'short-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
};

export const SAMPLE_RATE = 24_000;

/** Raw 16-bit mono PCM from a WAV file: the bytes of its `data` chunk. */
export const wavToPcm = (wav: Buffer): Buffer => {
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === 'data') return wav.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  throw new Error('WAV has no data chunk');
};

export const pcmToWav = (pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};

export const pcmSeconds = (pcm: Buffer, sampleRate = SAMPLE_RATE): number => pcm.length / (sampleRate * 2);
