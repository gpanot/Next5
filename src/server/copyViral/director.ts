// server-only — never import from a 'use client' file.
// The Claude Code director: instead of the fixed rules alone, Claude Code (the /copy-viral-render skill, on Guillaume's
// own subscription, no API) refines the drafted edit until it looks like the original, then renders it.
// Here: the side-by-side sheets it judges with, and the headless `claude -p` launch from the admin tab.

import { execFile, spawn } from 'child_process';
import { existsSync } from 'fs';
import { appendFile, mkdir, readFile, rm } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import type { ShotSpan } from './assemble';
import { subscriptionEnv } from './claudeEnv';
import { engine, failJob, type Job } from './render';
import { getProject, projectFile } from './store';

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

type Timeline = { speed?: number; keeps: [number, number, number][] };

/** A time of the joined take (SOURCE) on the cut edit (SHORT): the keep it falls in, else the next keep's start. */
export const sourceToShort = (timeline: Timeline, src: number): number => {
  const speed = timeline.speed || 1;
  for (const [a, b, at] of timeline.keeps) {
    if (src < a) return at;
    if (src <= b) return at + (src - a) / speed;
  }
  const last = timeline.keeps[timeline.keeps.length - 1];
  return last ? last[2] + (last[1] - last[0]) / speed : 0;
};

/**
 * One image per shot: the original's still (left) next to my edit at the same moment of the shot (right), plus all
 * of them in one sheet. What the director looks at to match framing, cutout, texts and captions.
 */
export const compareSheets = async (job: Job): Promise<{ sheet: string; shots: string[] }> => {
  const dir = projectFile(job.id, job.dirName);
  const spans = JSON.parse(await readFile(path.join(dir, 'spans.json'), 'utf8')) as ShotSpan[];
  const timeline = JSON.parse(await readFile(path.join(dir, 'assets', 'timeline.json'), 'utf8')) as Timeline;
  const times = spans.map((s) => sourceToShort(timeline, (s.from + s.to) / 2).toFixed(2));
  await rm(path.join(dir, 'stills'), { recursive: true, force: true });
  await engine(job, ['stills', dir, ...times]);
  const out = path.join(dir, 'compare');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const shots: string[] = [];
  for (const [i, shot] of job.shots.entries()) {
    const mine = path.join(dir, 'stills', `t${times[i].padStart(5, '0')}.jpg`);
    const original = shot.frame ? projectFile(job.id, shot.frame) : null;
    if (!original || !existsSync(original) || !existsSync(mine)) continue;
    const file = path.join(out, `shot-${String(shot.index + 1).padStart(2, '0')}.jpg`);
    await execFileAsync(FFMPEG, ['-y', '-v', 'error', '-i', original, '-i', mine, '-filter_complex', '[0]scale=540:960,setsar=1[a];[1]scale=540:960,setsar=1[b];[a][b]hstack', '-q:v', '3', file]);
    shots.push(file);
  }
  const sheet = path.join(out, 'all.jpg');
  if (shots.length) {
    const cols = Math.min(4, shots.length);
    const inputs = shots.flatMap((f) => ['-i', f]);
    const scaled = shots.map((_, k) => `[${k}]scale=540:480[s${k}]`).join(';');
    const pad = (cols - (shots.length % cols)) % cols;
    const blanks = Array.from({ length: pad }, (_, k) => `color=c=black:s=540x480:d=1[p${k}]`).join(';');
    const all = [...shots.map((_, k) => `[s${k}]`), ...Array.from({ length: pad }, (_, k) => `[p${k}]`)].join('');
    const filter = `${scaled}${blanks ? `;${blanks}` : ''};${all}xstack=inputs=${shots.length + pad}:layout=${Array.from({ length: shots.length + pad }, (_, k) => `${(k % cols) * 540}_${Math.floor(k / cols) * 480}`).join('|')}[o]`;
    await execFileAsync(FFMPEG, ['-y', '-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[o]', '-frames:v', '1', '-q:v', '3', sheet]);
  }
  return { sheet, shots };
};

/** The tools the headless director may use: read and edit files, our CLI, the engine, ffmpeg. Nothing else. */
const ALLOWED_TOOLS = [
  'Read', 'Edit', 'Write', 'Glob', 'Grep',
  'Bash(npx tsx scripts/copy-viral.ts:*)',
  'Bash(node tools/video-agent-engine/engine/short.mjs:*)',
  'Bash(ffmpeg:*)', 'Bash(ffprobe:*)',
];

/** The command that runs the director by hand in Claude Code (shown in the tab). */
export const directorCommand = (job: Pick<Job, 'id' | 'sequence' | 'resolution'>) =>
  `/copy-viral-render ${job.id}${job.sequence !== null ? ` --sequence ${job.sequence + 1}` : ''} --resolution ${job.resolution}`;

/**
 * Runs the /copy-viral-render skill headless (`claude -p`) in the repo, on Guillaume's Claude Code login. Its output
 * goes to claude-<dir>.log. The skill marks the edit done itself (scripts/copy-viral.ts render); if Claude exits
 * while the job still shows running, the job fails with the end of the log.
 */
export const startClaudeDirector = async (job: Job) => {
  const log = projectFile(job.id, `claude-${job.dirName}.log`);
  await rm(log, { force: true });
  await job.step('Claude Code is directing (draft, compare with the original, fix, render)…');
  const child = spawn(process.env.CLAUDE_BIN ?? 'claude', [
    '-p', directorCommand(job),
    '--permission-mode', 'acceptEdits',
    '--allowedTools', ...ALLOWED_TOOLS,
  ], { cwd: process.cwd(), env: subscriptionEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
  let tail = '';
  const keep = (chunk: Buffer) => {
    tail = (tail + chunk.toString()).slice(-3000);
    void appendFile(log, chunk);
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  const stillRunning = async () => {
    const p = await getProject(job.id);
    return job.sequence === null ? p.edit?.status === 'RUNNING' : p.previews[String(job.sequence)]?.status === 'RUNNING';
  };
  child.on('error', (err) => void failJob(job, new Error(`Could not start Claude Code: ${err.message}`)));
  child.on('close', async (code) => {
    if (await stillRunning()) await failJob(job, new Error(`Claude Code stopped (exit ${code}) before rendering: ${tail.trim().split('\n').slice(-3).join(' | ')}`));
  });
};
