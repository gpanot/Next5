// server-only — never import from a 'use client' file.
// The reel's look measured once by Claude Code (the /copy-viral-steal skill, built on /steal: contact sheets, cut
// rhythm, spectrogram, face size and zooms) instead of guessed from Gemini's words. It writes stolen/ in the project
// folder; every edit after that uses it (src/server/copyViral/render.ts). Runs on Guillaume's Claude Code login.

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { appendFile, readFile, rm } from 'fs/promises';
import { homedir } from 'os';
import path from 'path';
import { HttpError } from '../http';
import { subscriptionEnv } from './claudeEnv';
import { getProject, mutateProject, projectFile } from './store';
import { parseScenePlan, resolveScenePlan, type ScenePlan } from './scenePlan';
import type { EngineStyle } from './styleMap';

export const STEAL_DIR = 'stolen';
export const STEAL_LOG = 'claude-steal.log';

/** Where captions sit, whether the reel shows any, and where split shots' camera card starts: the spec holds these. */
export type StealHints = { captionY: number | null; captions: boolean; splitSeam: number | null };

export type Stolen = { style: EngineStyle; hints: StealHints; plan: ScenePlan };

const readJson = async (file: string): Promise<unknown> => JSON.parse(await readFile(file, 'utf8'));

const toHints = (raw: unknown): StealHints => {
  const h = (raw ?? {}) as Record<string, unknown>;
  const y = typeof h.captionY === 'number' && h.captionY >= 100 && h.captionY <= 1820 ? Math.round(h.captionY) : null;
  const seam = typeof h.splitSeam === 'number' && h.splitSeam >= 600 && h.splitSeam <= 1700 ? Math.round(h.splitSeam) : null;
  return { captionY: y, captions: h.captions !== false, splitSeam: seam };
};

/**
 * Reads stolen/ and checks it is usable: throws with the reason (the skill's done step shows it to Claude Code).
 * `strict` (the done step) requires scenes.json; a look measured before the board plans existed renders without it.
 */
export const readStolenFiles = async (id: string, strict = true): Promise<Stolen> => {
  const styleFile = projectFile(id, `${STEAL_DIR}/style.json`);
  if (!existsSync(styleFile)) throw new Error(`${styleFile} is missing`);
  const style = (await readJson(styleFile)) as EngineStyle;
  if (!style || typeof style !== 'object' || Array.isArray(style)) throw new Error('style.json must be an object');
  for (const key of ['colors', 'captions']) if (!style[key]) throw new Error(`style.json needs "${key}"`);
  if ((style.layout as { seam?: unknown } | undefined)?.seam !== undefined) throw new Error('style.json must not set layout.seam: the layout changes shot by shot');
  if (!existsSync(projectFile(id, `${STEAL_DIR}/STYLE.md`))) throw new Error('STYLE.md is missing');
  const hintsFile = projectFile(id, `${STEAL_DIR}/hints.json`);
  const scenesFile = projectFile(id, `${STEAL_DIR}/scenes.json`);
  if (!existsSync(scenesFile)) {
    if (strict) throw new Error('scenes.json is missing (write {"shots": {}} when no shot has boards)');
    return { style, hints: toHints(existsSync(hintsFile) ? await readJson(hintsFile) : {}), plan: {} };
  }
  const { shots } = await getProject(id);
  const plan = parseScenePlan(await readJson(scenesFile), shots.length);
  // every time must resolve: run the plan on 1 s shots with no words
  resolveScenePlan(plan, shots.map((s, i) => ({ index: s.index, from: i, to: i + 1 })), []);
  return { style, hints: toHints(existsSync(hintsFile) ? await readJson(hintsFile) : {}), plan };
};

/** The stolen look when its run finished, else null (the edit falls back to the style mapped from Gemini's words). */
export const loadStolen = async (id: string): Promise<Stolen | null> => {
  const project = await getProject(id);
  if (project.steal?.status !== 'DONE') return null;
  return readStolenFiles(id, false).catch(() => null);
};

const setSteal = (id: string, patch: Partial<NonNullable<Awaited<ReturnType<typeof getProject>>['steal']>>) =>
  mutateProject(id, (p) => (p.steal ? { ...p, steal: { ...p.steal, ...patch } } : p));

export const finishSteal = async (id: string, summary: string) => {
  const { plan } = await readStolenFiles(id);
  const boards = Object.values(plan).filter((scenes) => scenes.length > 0).length;
  return setSteal(id, { status: 'DONE', finishedAt: new Date().toISOString(), error: null, summary: summary.slice(0, 2000), boards });
};

export const failSteal = (id: string, error: string) => setSteal(id, { status: 'FAILED', finishedAt: new Date().toISOString(), error });

const ALLOWED_TOOLS = [
  'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'Bash(npx tsx scripts/copy-viral.ts:*)',
  'Bash(ffmpeg:*)', 'Bash(ffprobe:*)', 'Bash(mkdir:*)', 'Bash(cp:*)',
];

/**
 * Starts the headless run (`claude -p "/copy-viral-steal <id>"`); the skill marks it done or failed itself.
 * `boards` keeps the look already in stolen/ (a saved setup) and only writes this reel's board animations: a few
 * minutes instead of 10 to 15.
 */
export const startSteal = async (id: string, mode: 'measure' | 'boards' = 'measure') => {
  const before = await getProject(id);
  if (mode === 'boards' && before.steal?.status !== 'DONE') throw new HttpError(409, 'no_look', 'Use a saved setup or measure the look first');
  if (mode === 'measure') await rm(projectFile(id, STEAL_DIR), { recursive: true, force: true });
  const log = projectFile(id, STEAL_LOG);
  await rm(log, { force: true });
  const setup = mode === 'boards' ? before.steal?.setup ?? null : null;
  await mutateProject(id, (p) => ({ ...p, steal: { status: 'RUNNING', startedAt: new Date().toISOString(), finishedAt: null, error: null, summary: mode === 'boards' ? p.steal?.summary ?? '' : '', mode, setup } }));
  const child = spawn(process.env.CLAUDE_BIN ?? 'claude', [
    '-p', `/copy-viral-steal ${id}${mode === 'boards' ? ' --boards' : ''}`,
    '--permission-mode', 'acceptEdits',
    // the /steal skill and its learnings live in Guillaume's own skills folder
    '--add-dir', path.join(homedir(), '.claude', 'skills', 'steal'),
    '--allowedTools', ...ALLOWED_TOOLS,
  ], { cwd: process.cwd(), env: subscriptionEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
  let tail = '';
  const keep = (chunk: Buffer) => {
    tail = (tail + chunk.toString()).slice(-3000);
    void appendFile(log, chunk);
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  child.on('error', (err) => void failSteal(id, `Could not start Claude Code: ${err.message}`));
  child.on('close', async (code) => {
    if ((await getProject(id)).steal?.status === 'RUNNING') {
      await failSteal(id, `Claude Code stopped (exit ${code}) before finishing: ${tail.trim().split('\n').slice(-3).join(' | ')}`);
    }
  });
};
