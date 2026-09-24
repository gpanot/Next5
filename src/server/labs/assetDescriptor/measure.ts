/**
 * src/server/labs/assetDescriptor/measure.ts
 *
 * ffprobe + ffmpeg measurement utilities:
 *   - probe()                  → ProbeResult
 *   - measureLoudness()        → LoudnessResult  (absolute + relative, music and video)
 *   - detectSceneCuts()        → number[]
 *   - lufsToDigit()            exported for unit tests
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ProbeResult, LoudnessResult } from './types';

const execFileAsync = promisify(execFile);

const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';
const FFMPEG  = process.env.FFMPEG_PATH  ?? 'ffmpeg';

// ── Loudness mapping ──────────────────────────────────────────────────────────
//
// Absolute mapping: maps the broadcast loudness range onto 0–9.
//   level = clamp((lufs + 40) / 35, 0, 1)   → digit = round(level × 9)
//   -40 LUFS → 0,  -30 → 3,  -14 → 7,  -5 → 9
//
// The -40 LUFS lower bound is chosen so silence (-120 LUFS) maps to 0 via clamp
// without discarding real data. Never apply a hard LUFS floor beyond isFinite().
//
// NOTE (ffmpeg 8): per-frame M: lines require -v verbose.
// Without it the default (warning) log level emits only the summary block.

export function lufsToDigit(lufs: number): number {
  const level = Math.min(1, Math.max(0, (lufs + 40) / 35));
  return Math.round(level * 9);
}

// ── ffprobe ───────────────────────────────────────────────────────────────────

export async function probe(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath,
  ]);
  const info = JSON.parse(stdout) as {
    format?: { duration?: string; size?: string };
    streams?: Array<{ codec_type?: string }>;
  };
  return {
    durationSec:   parseFloat(info.format?.duration ?? '0'),
    hasVideo:      !!info.streams?.find(s => s.codec_type === 'video'),
    hasAudio:      !!info.streams?.find(s => s.codec_type === 'audio'),
    fileSizeBytes: parseInt(info.format?.size ?? '0', 10),
  };
}

// ── Loudness curve ────────────────────────────────────────────────────────────

export async function measureLoudness(
  filePath: string,
  durationSec: number,
  isMusic: boolean,
): Promise<LoudnessResult> {
  try {
    // -v verbose is required in ffmpeg 8 to emit per-frame M: momentary loudness lines.
    // Without it only the final summary block is written to stderr and samplesRead stays 0.
    const { stderr } = await execFileAsync(FFMPEG, [
      '-v', 'verbose',
      '-hide_banner',
      '-i', filePath,
      '-af', 'ebur128=framelog=verbose',
      '-f', 'null', '-',
    ], { maxBuffer: 16 * 1024 * 1024 });

    const re = /\] t:\s*([\d.]+)\s+TARGET[^\n]+M:\s*([-\d.]+)/g;
    const bySecond = new Map<number, number>(); // second bucket → max LUFS in that bucket
    let m: RegExpExecArray | null;
    let samplesRead = 0;

    while ((m = re.exec(stderr)) !== null) {
      const t = parseFloat(m[1]), lufs = parseFloat(m[2]);
      // Only drop genuine NaN / ±Infinity; never apply a hard LUFS floor.
      // Silence (-120 LUFS) is a valid measurement and correctly maps to digit 0.
      if (!isFinite(t) || !isFinite(lufs)) continue;
      samplesRead++;
      const sec = Math.floor(t);
      const prev = bySecond.get(sec);
      if (prev === undefined || lufs > prev) bySecond.set(sec, lufs);
    }

    if (samplesRead === 0) {
      // Most likely: file has no audio stream, or -v verbose wasn't effective.
      console.warn(
        `[measure] ebur128: 0 M: lines in ${stderr.length} B of stderr for ${filePath}`,
      );
      return { absolute: '', relative: '', flat: true, samplesRead: 0 };
    }

    // ── Absolute digit string ──────────────────────────────────────────────
    const nSec = Math.ceil(durationSec);
    const rawLufs: Array<number | undefined> = [];
    for (let s = 0; s < nSec; s++) rawLufs.push(bySecond.get(s));

    const absArr = rawLufs.map(lufs => (lufs !== undefined ? String(lufsToDigit(lufs)) : '0'));
    const absolute = absArr.join(' ');

    const unique = new Set(absArr);
    const flat = unique.size === 1;

    // ── Relative digit string (music only) ────────────────────────────────
    // Rescale max per second within this track: min→0, max→9.
    // Omit if max-min < 1 LU (track is mastered to wall-to-wall constant level).
    let relative = '';
    if (isMusic) {
      const defined = rawLufs.filter((v): v is number => v !== undefined);
      if (defined.length > 0) {
        const minLufs = Math.min(...defined);
        const maxLufs = Math.max(...defined);
        const rangeL  = maxLufs - minLufs;
        if (rangeL >= 1) {
          const relArr = rawLufs.map(lufs => {
            if (lufs === undefined) return '0';
            const level = Math.min(1, Math.max(0, (lufs - minLufs) / rangeL));
            return String(Math.round(level * 9));
          });
          relative = relArr.join(' ');
        }
      }
    }

    return { absolute, relative, flat, samplesRead };
  } catch (err) {
    console.warn('[measure] measureLoudness failed:', err instanceof Error ? err.message : err);
    return { absolute: '', relative: '', flat: true, samplesRead: 0 };
  }
}

// ── Scene cut detection ───────────────────────────────────────────────────────

export async function detectSceneCuts(
  filePath: string,
  durationSec: number,
): Promise<number[]> {
  try {
    const { stderr } = await execFileAsync(FFMPEG, [
      '-hide_banner', '-nostats',
      '-i', filePath,
      '-an',
      '-filter:v', "select='gt(scene,0.3)',showinfo",
      '-f', 'null', '-',
    ], { maxBuffer: 4 * 1024 * 1024 });

    const re = /pts_time:([\d.]+)/g;
    const cuts: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(stderr)) !== null) {
      const t = parseFloat(match[1]);
      // Drop cuts within 0.2s of start or end to avoid boundary noise
      if (!isNaN(t) && t >= 0.2 && t <= durationSec - 0.2) cuts.push(+t.toFixed(2));
    }
    return cuts;
  } catch {
    return [];
  }
}

// ── fps selection ─────────────────────────────────────────────────────────────

export function videoFps(durationSec: number): number {
  if (durationSec <= 10) return 5;
  if (durationSec <= 20) return 3;
  return 2;
}
