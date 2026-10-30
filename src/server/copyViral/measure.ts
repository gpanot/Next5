// server-only — never import from a 'use client' file.
// Numbers for the director instead of eyeballing: face size and position (Apple Vision, the engine's faces.swift) on
// the original's frame and on my edit at the same moment of each shot, and the exact cutout correction to match.

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';
import type { ShotSpan } from './assemble';
import { sourceToShort } from './director';
import type { Job } from './render';
import { projectFile } from './store';

const execFileAsync = promisify(execFile);
const W = 1080;
const H = 1920;

/** Face box centre and height, in px of a 1080×1920 frame. */
export type Face = { cx: number; cy: number; h: number };

/** Match tolerances the director must reach on every shot before rendering. */
export const TOLERANCE = { sizePct: 8, px: 40 };

type Cutout = { from: number; to: number; scale?: number; x?: number; bottom?: number };
type Spec = { cam?: { crop?: number[]; eyes?: number[] }; cutout?: Cutout | Cutout[]; zoom?: { keys?: number[][] } };

/** The engine's Apple Vision face tool (compiled once by the engine), as a command. */
const facesTool = async (): Promise<{ cmd: string; args: string[] }> => {
  const platform = path.join(/*turbopackIgnore: true*/ process.cwd(), 'tools', 'video-agent-engine', 'engine', 'platform.mjs');
  const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '-e', `import { visionTool } from ${JSON.stringify(platform)}; console.log(JSON.stringify(visionTool('faces')))`]);
  return JSON.parse(stdout.trim().split('\n').pop() ?? '{}') as { cmd: string; args: string[] };
};

/** The biggest face in one image, scaled to a 1080×1920 frame; null when there is none. One image per run (the tool smooths across images). */
const faceOf = async (tool: { cmd: string; args: string[] }, image: string, size: { w: number; h: number }): Promise<Face | null> => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cv-face-'));
  try {
    await copyFile(image, path.join(dir, '00001.jpg'));
    const out = path.join(dir, 'faces.json');
    await execFileAsync(tool.cmd, [...tool.args, dir, out], { timeout: 60_000 });
    const [box] = JSON.parse(await readFile(out, 'utf8')) as number[][];
    if (!box || box[3] <= 0) return null;
    const kx = W / size.w;
    const ky = H / size.h;
    return { cx: Math.round(box[0] * kx), cy: Math.round(box[1] * ky), h: Math.round(box[3] * ky) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const imageSize = async (file: string) => {
  const { stdout } = await execFileAsync(process.env.FFPROBE_PATH ?? 'ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  const [w, h] = stdout.trim().split(',').map(Number);
  return { w, h };
};

const loadSpec = async (file: string): Promise<Spec> => {
  const ctx: { SPEC?: Spec } = {};
  new Function('window', await readFile(file, 'utf8'))(ctx);
  return ctx.SPEC ?? {};
};

/**
 * The cutout values that put my face where the original's is, at its size, from where it is now. The engine draws the
 * take at scale s with its eyes at x and the take's bottom edge at `bottom`: solve for the new s, x, bottom.
 */
export const correctCutout = (c: Required<Pick<Cutout, 'scale' | 'x' | 'bottom'>>, cam: { eyesX: number; height: number }, mine: Face, target: Face) => {
  const s = c.scale * (target.h / mine.h);
  const x0 = c.x - cam.eyesX * c.scale;
  const y0 = c.bottom - cam.height * c.scale;
  // my face centre in take px, which does not move with the cutout values
  const fx = (mine.cx - x0) / c.scale;
  const fy = (mine.cy - y0) / c.scale;
  const r = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
  return { scale: r(s, 3), x: r(target.cx - fx * s + cam.eyesX * s), bottom: r(target.cy - fy * s + cam.height * s) };
};

export type ShotMeasure = {
  shot: number;
  original: Face | null;
  mine: Face | null;
  sizeDiffPct: number | null;
  dx: number | null;
  dy: number | null;
  ok: boolean;
  /** Index in spec.cutout (as a list) driving this shot, its values now, and the values that match. */
  cutout: { index: number; now: { scale: number; x: number; bottom: number }; match: { scale: number; x: number; bottom: number } } | null;
  note: string;
};

/** Measures every shot of the job on the stills `compare` made (run `compare` first). */
export const measureShots = async (job: Job): Promise<{ allOk: boolean; tolerance: typeof TOLERANCE; shots: ShotMeasure[] }> => {
  const dir = projectFile(job.id, job.dirName);
  const spans = JSON.parse(await readFile(path.join(dir, 'spans.json'), 'utf8')) as ShotSpan[];
  const timeline = JSON.parse(await readFile(path.join(dir, 'assets', 'timeline.json'), 'utf8')) as Parameters<typeof sourceToShort>[0];
  const spec = await loadSpec(path.join(dir, 'source', 'spec.js'));
  const cutouts = ([] as Cutout[]).concat(spec.cutout ?? []);
  const cam = { eyesX: spec.cam?.eyes?.[0] ?? 540, height: spec.cam?.crop?.[3] ?? H };
  const tool = await facesTool();
  await mkdir(path.join(dir, 'compare'), { recursive: true });
  const shots: ShotMeasure[] = [];
  for (const [i, shot] of job.shots.entries()) {
    const mid = (spans[i].from + spans[i].to) / 2;
    const still = path.join(dir, 'stills', `t${sourceToShort(timeline, mid).toFixed(2).padStart(5, '0')}.jpg`);
    const frame = shot.frame ? projectFile(job.id, shot.frame) : null;
    const original = frame && existsSync(frame) ? await faceOf(tool, frame, await imageSize(frame)) : null;
    const mine = existsSync(still) ? await faceOf(tool, still, await imageSize(still)) : null;
    const k = cutouts.findIndex((c) => mid >= c.from && mid < c.to && c.scale !== undefined);
    const c = k >= 0 ? cutouts[k] : null;
    const base = { shot: shot.index + 1, original, mine };
    if (!original || !mine) {
      shots.push({ ...base, sizeDiffPct: null, dx: null, dy: null, ok: !original, cutout: null, note: !original ? 'no face in the original: nothing to match' : 'no face found in my still: run compare again' });
      continue;
    }
    const sizeDiffPct = Math.round(((mine.h - original.h) / original.h) * 100);
    const dx = mine.cx - original.cx;
    const dy = mine.cy - original.cy;
    const ok = Math.abs(sizeDiffPct) <= TOLERANCE.sizePct && Math.abs(dx) <= TOLERANCE.px && Math.abs(dy) <= TOLERANCE.px;
    const now = c ? { scale: c.scale ?? 1.15, x: c.x ?? 540, bottom: c.bottom ?? H } : null;
    shots.push({
      ...base, sizeDiffPct, dx, dy, ok,
      cutout: now ? { index: k, now, match: correctCutout(now, cam, mine, original) } : null,
      note: ok ? 'matches' : now ? `set cutout[${k}] to the match values` : 'real room: zoom.keys can only make me bigger (1 to 1.15); to shrink me, put this shot in a cutout too',
    });
  }
  return { allOk: shots.every((s) => s.ok), tolerance: TOLERANCE, shots };
};
