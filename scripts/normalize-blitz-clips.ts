/**
 * Re-encodes the library clips that stall Blitz renders (see src/server/labs/blitzClip.ts): MP4 assets with more than
 * 4 s between keyframes (often one keyframe for the whole clip) and a bitrate over 8 Mbps. A sparse keyframe at a
 * normal bitrate renders fine (2026-10-19 dry-run: 621 risky clips of 1255; 592 others only had a 2-5 s gap). Each one is first copied to
 * blitz/originals/<key>, then written back to its own key, so projects and posters keep working.
 *
 *   npx tsx --env-file=.env.local scripts/normalize-blitz-clips.ts --dry-run          # list the clips it would fix
 *   npx tsx --env-file=.env.local scripts/normalize-blitz-clips.ts                    # fix them
 *   npx tsx --env-file=.env.local scripts/normalize-blitz-clips.ts --key blitz/videos/<id>.mp4   # one clip
 *
 * Needs ffprobe and ffmpeg on the PATH (brew install ffmpeg). No API cost; R2 egress only.
 */
import { execFile } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';
import { prisma } from '../src/lib/db';
import { getObjectBuffer, getPresignedUrl, uploadToR2 } from '../src/lib/r2';
import { clipArgs } from '../src/server/labs/blitzClip';

const run = promisify(execFile);

const MAX_KEY_GAP_S = 4;
const MAX_BITRATE = 8_000_000;
const PARALLEL = 6;

type Probe = { keyGap: number; bitrate: number; width: number };

/** Largest gap between keyframes (the end of the clip counts), bitrate and width. */
async function probe(url: string): Promise<Probe> {
  const info = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,bit_rate:format=duration,bit_rate', '-of', 'json', url]);
  const json = JSON.parse(info.stdout) as { streams?: { width?: number; bit_rate?: string }[]; format?: { duration?: string; bit_rate?: string } };
  const duration = Number(json.format?.duration) || 0;
  const keys = await run('ffprobe', ['-v', 'error', '-skip_frame', 'nokey', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', url], { maxBuffer: 8 * 1024 * 1024 });
  const times = [...keys.stdout.split('\n').map(Number).filter(Number.isFinite), duration].sort((a, b) => a - b);
  const keyGap = times.reduce((max, t, i) => (i === 0 ? max : Math.max(max, t - times[i - 1])), times[0] ?? 0);
  return { keyGap, bitrate: Number(json.streams?.[0]?.bit_rate ?? json.format?.bit_rate) || 0, width: json.streams?.[0]?.width ?? 0 };
}

const needsFix = (p: Probe): boolean => p.keyGap > MAX_KEY_GAP_S && p.bitrate > MAX_BITRATE;

/** Backs the original up, re-encodes it locally and writes it back to its key. */
async function fix(key: string): Promise<void> {
  const original = await getObjectBuffer(key);
  if (!original) throw new Error('missing in R2');
  await uploadToR2(`blitz/originals/${key}`, original, 'video/mp4');
  const dir = await mkdtemp(path.join(tmpdir(), 'clip-'));
  try {
    const input = path.join(dir, 'in.mp4');
    const output = path.join(dir, 'out.mp4');
    await writeFile(input, original);
    await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...clipArgs(input, output)], { timeout: 180_000 });
    await uploadToR2(key, await readFile(output), 'video/mp4');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function check(key: string, dryRun: boolean): Promise<'fixed' | 'ok' | 'failed'> {
  try {
    const url = await getPresignedUrl(key, 900);
    if (!url) throw new Error('R2 is not configured');
    const p = await probe(url);
    if (!needsFix(p)) return 'ok';
    const label = `${key}  keyGap=${p.keyGap.toFixed(1)}s  ${(p.bitrate / 1e6).toFixed(1)} Mbps  ${p.width}w`;
    if (dryRun) return void console.log(`would fix ${label}`), 'fixed';
    await fix(key);
    console.log(`fixed ${label}`);
    return 'fixed';
  } catch (err) {
    console.warn(`failed ${key}: ${err instanceof Error ? err.message.slice(0, 200) : err}`);
    return 'failed';
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const one = process.argv[process.argv.indexOf('--key') + 1];
  const keys = process.argv.includes('--key') && one
    ? [one]
    : (await prisma.blitzAsset.findMany({ where: { r2Key: { endsWith: '.mp4' } }, select: { r2Key: true }, orderBy: { createdAt: 'asc' } })).map((a) => a.r2Key);
  const counts = { fixed: 0, ok: 0, failed: 0 };
  for (let i = 0; i < keys.length; i += PARALLEL) {
    const results = await Promise.all(keys.slice(i, i + PARALLEL).map((k) => check(k, dryRun)));
    for (const r of results) counts[r] += 1;
    if ((i / PARALLEL) % 20 === 0) console.log(`… ${Math.min(i + PARALLEL, keys.length)}/${keys.length}`);
  }
  console.log(`${dryRun ? 'would fix' : 'fixed'} ${counts.fixed}, ok ${counts.ok}, failed ${counts.failed} (of ${keys.length})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
