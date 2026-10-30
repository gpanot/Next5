// server-only — never import from a 'use client' file.
// Copy Viral Post, phase 3: Guillaume's takes joined in shot order, edited by the vendored short-editing engine
// (tools/video-agent-engine: Node + headless Chrome + ffmpeg + whisper.cpp) in the reference's look.
// Steps: join → init (face framing) → words → our style.json + spec.js → prepare (silences cut, cutout) → stills →
// render (a 720×1280 draft when asked) → .srt. The same pipeline makes the quick preview of one sequence.

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { appendFile, copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import type { CopyViralDirector, CopyViralEdit, CopyViralPreview, CopyViralProject, CopyViralResolution, CopyViralShot } from '../../types/admin/copyViral';
import { startClaudeDirector } from './director';
import { HttpError } from '../http';
import { assembleTake, type ShotSpan } from './assemble';
import { writeSrt } from './deliver';
import type { SpokenWord } from './reveal';
import { resolveScenePlan } from './scenePlan';
import { buildSpec } from './specBuilder';
import { getProject, mutateProject, projectDir, projectFile } from './store';
import { loadStolen, STEAL_DIR } from './steal';
import { CREATOR_BLOCK, toEngineStyle } from './styleMap';

const ENGINE = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'tools', 'video-agent-engine', 'engine', 'short.mjs');
export const EDIT_DIR = 'short-edit';

/** One engine run: the full edit, or the quick preview of one sequence. */
export type Job = {
  id: string;
  project: CopyViralProject;
  shots: CopyViralShot[];
  /** Folder of the engine project, inside the project folder (its name is the output file's slug). */
  dirName: string;
  log: string;
  resolution: CopyViralResolution;
  /** Shows what the engine is doing now. */
  step: (text: string) => Promise<unknown>;
  stills: boolean;
  /** The sequence a preview is for; null = the full edit. */
  sequence: number | null;
};

/** One engine command; its output goes to the job's log. Rejects with the last lines on a non-zero exit. */
export const engine = (job: Job, args: string[]) => new Promise<void>((resolve, reject) => {
  const log = projectFile(job.id, job.log);
  const child = spawn(process.execPath, [ENGINE(), ...args], {
    cwd: projectDir(job.id),
    // An empty profile next to the project: the engine never picks up a style from elsewhere on this Mac.
    env: { ...process.env, SHORT_EDITING_HOME: projectFile(job.id, 'profile') },
  });
  let tail = '';
  const keep = (chunk: Buffer) => {
    tail = (tail + chunk.toString()).slice(-4000);
    void appendFile(log, chunk);
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  child.on('error', reject);
  child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`engine ${args[0]} failed: ${tail.trim().split('\n').slice(-4).join(' | ')}`))));
});

/** The `cam:` line init wrote (face found on the take), kept as is in our spec. */
const camLine = async (dir: string) => {
  const starter = await readFile(path.join(dir, 'source', 'spec.js'), 'utf8');
  const line = starter.split('\n').find((l) => l.trim().startsWith('cam:'));
  if (!line) throw new Error('The engine did not frame the camera (no cam line in the starter spec)');
  return line;
};

/** The engine's final file: <slug>.mp4, or <slug>-draft.mp4 for a scaled render (never its silent video.mp4). */
const findOutput = async (dir: string, slug: string, draft: boolean) => {
  const files = existsSync(dir) ? await readdir(dir) : [];
  return files.find((f) => f === `${slug}${draft ? '-draft' : ''}.mp4`) ?? null;
};

/** Each shot's background copied into the edit (assets/images/), as the spec names it; null = the real room. */
const copyBackgrounds = async (id: string, dir: string, shots: CopyViralShot[]) => {
  await mkdir(path.join(dir, 'assets', 'images'), { recursive: true });
  return Promise.all(shots.map(async (s) => {
    if (!s.background || !existsSync(projectFile(id, s.background))) return null;
    const name = `assets/images/bg-${s.index + 1}${path.extname(s.background)}`;
    await copyFile(projectFile(id, s.background), path.join(dir, name));
    return name;
  }));
};

/** init (face framing) → words → our style.json + spec.js, timed on Guillaume's own words. */
const author = async (job: Job, dir: string, take: string, spans: ShotSpan[]) => {
  await job.step('Framing my face…');
  await engine(job, ['init', dir, '--source', take]);
  await job.step('Listening to my takes (word timings)…');
  await engine(job, ['words', dir, 'en']);
  const scribe = JSON.parse(await readFile(path.join(dir, 'assets', 'words-scribe.json'), 'utf8')) as { words?: (SpokenWord & { type?: string })[] };
  const words = (scribe.words ?? []).filter((w) => w.type !== 'spacing');
  // the measured look (Claude Code /copy-viral-steal) when there is one, else the one mapped from Gemini's words
  const stolen = await loadStolen(job.id);
  const name = `copy-${job.id.slice(0, 8)}`;
  const style = stolen ? { ...stolen.style, name, creator: CREATOR_BLOCK } : toEngineStyle(job.project.style, name);
  if (stolen && existsSync(projectFile(job.id, `${STEAL_DIR}/assets`))) {
    await cp(projectFile(job.id, `${STEAL_DIR}/assets`), path.join(dir, 'assets'), { recursive: true });
  }
  const musicMuted = (style.music as { mute?: boolean } | undefined)?.mute === true;
  const backgrounds = await copyBackgrounds(job.id, dir, job.shots);
  await writeFile(path.join(dir, 'source', 'style.json'), JSON.stringify(style, null, 2));
  const captions = stolen ? { y: stolen.hints.captionY, show: stolen.hints.captions } : undefined;
  const planned = stolen ? { scenes: resolveScenePlan(stolen.plan, spans, words), shots: new Set(Object.keys(stolen.plan).map(Number)) } : undefined;
  const spec = buildSpec({
    title: job.project.title, camLine: await camLine(dir), shots: job.shots, spans, style: job.project.style, musicMuted, words, backgrounds,
    captions, splitSeam: stolen?.hints.splitSeam, planned,
  });
  await writeFile(path.join(dir, 'source', 'spec.js'), spec);
};

/**
 * Draft: joins the job's takes, frames the face, times the words, writes our style.json + spec.js and runs `prepare`
 * (silences cut, cutout). After it, the spec can be refined (Claude Code director) before `renderJob`.
 */
export const draftJob = async (job: Job): Promise<ShotSpan[]> => {
  const dir = projectFile(job.id, job.dirName);
  await rm(dir, { recursive: true, force: true });
  await rm(projectFile(job.id, job.log), { force: true });
  await mkdir(projectFile(job.id, 'profile'), { recursive: true });

  await job.step('Joining my takes in shot order…');
  const take = projectFile(job.id, `${job.dirName}-take.mp4`);
  const spans = await assembleTake(job.id, job.shots, '1080x1920', take);
  await author(job, dir, take, spans);
  await writeFile(path.join(dir, 'spans.json'), JSON.stringify(spans));

  const cutout = job.shots.some((s) => s.background);
  await job.step(cutout ? 'Cutting the silences and cutting me out (backgrounds)…' : 'Cutting the silences…');
  await engine(job, ['prepare', dir]);
  return spans;
};

/** Renders the (drafted, maybe refined) spec, writes the .srt, returns the paths the tab shows. */
export const renderJob = async (job: Job): Promise<Partial<CopyViralEdit>> => {
  const dir = projectFile(job.id, job.dirName);
  if (job.stills) {
    const spans = JSON.parse(await readFile(path.join(dir, 'spans.json'), 'utf8')) as ShotSpan[];
    await job.step('Taking a still per shot…');
    await engine(job, ['stills', dir, ...spans.map((s) => `${((s.from + s.to) / 2).toFixed(2)}s`)]);
  }
  const draft = job.resolution === '720x1280';
  await job.step(draft ? 'Rendering a quick 720 draft, music and sound…' : 'Rendering the video, music and sound…');
  // --scale: the engine draws every frame at 2/3 size (720×1280) and names the file <slug>-draft.mp4
  await engine(job, ['all', dir, ...(draft ? ['--scale', '0.6667'] : [])]);

  const out = path.join(dir, 'output');
  const video = await findOutput(out, job.dirName, draft);
  if (!video) throw new Error(`The engine finished without a video: see ${job.log}`);
  const base = video.replace(/\.mp4$/, '');
  await writeSrt(path.join(dir, 'assets', 'timeline.json'), path.join(out, `${base}.srt`));
  const rel = (f: string, sub = 'output') => `${job.dirName}/${sub}/${f}`;
  const timeline = JSON.parse(await readFile(path.join(dir, 'assets', 'timeline.json'), 'utf8')) as { duration: number };
  const poster = `${job.dirName}-poster.jpg`;
  return {
    video: rel(video),
    poster: existsSync(path.join(out, poster)) ? rel(poster) : null,
    srt: rel(`${base}.srt`),
    sheet: existsSync(path.join(dir, 'stills', 'contact.jpg')) ? rel('contact.jpg', 'stills') : null,
    durationMs: Math.round(timeline.duration * 1000),
  };
};

export const failMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const setPreview = (id: string, seq: number, patch: Partial<CopyViralPreview>) =>
  mutateProject(id, (p) => {
    const current = p.previews[String(seq)];
    return current ? { ...p, previews: { ...p.previews, [String(seq)]: { ...current, ...patch } } } : p;
  });

/**
 * The job for the full edit (`sequence` null) or one sequence's preview, without touching the project's state:
 * the Claude Code CLI rebuilds it in each of its commands.
 */
export const jobFor = (project: CopyViralProject, sequence: number | null, resolution: CopyViralResolution): Job => {
  const { id } = project;
  if (sequence === null) {
    const step = (text: string) => mutateProject(id, (p) => (p.edit ? { ...p, edit: { ...p.edit, step: text } } : p));
    return { id, project, shots: project.shots, dirName: EDIT_DIR, log: 'render.log', resolution, step, stills: true, sequence: null };
  }
  return {
    id, project, shots: project.shots.filter((s) => s.sequence === sequence), dirName: `short-seq-${sequence + 1}`,
    log: `preview-seq-${sequence + 1}.log`, resolution, step: (text) => setPreview(id, sequence, { step: text }), stills: false, sequence,
  };
};

/** Marks the full edit as running (project RENDERING) and returns its job. */
export const beginEdit = async (id: string, resolution: CopyViralResolution, director: CopyViralDirector): Promise<Job> => {
  const edit: CopyViralEdit = {
    status: 'RUNNING', step: 'Starting…', resolution, director, startedAt: new Date().toISOString(), finishedAt: null,
    error: null, video: null, poster: null, srt: null, sheet: null, durationMs: 0,
  };
  const project = await mutateProject(id, (p) => ({ ...p, status: 'RENDERING', error: null, edit }));
  return jobFor(project, null, resolution);
};

/** Marks one sequence's preview as running (the project stays open for recording) and returns its job. */
export const beginPreview = async (id: string, seq: number, director: CopyViralDirector): Promise<Job> => {
  const project = await getProject(id);
  const shots = project.shots.filter((s) => s.sequence === seq);
  if (shots.length === 0) throw new HttpError(404, 'no_sequence', 'No such sequence');
  const missing = shots.filter((s) => !s.clip).map((s) => s.index + 1);
  if (missing.length) throw new HttpError(409, 'takes_missing', `Record shot ${missing.join(', ')} first`);
  const preview: CopyViralPreview = {
    status: 'RUNNING', step: 'Starting…', director, startedAt: new Date().toISOString(), finishedAt: null, error: null, video: null,
    takes: shots.map((s) => s.clip?.file ?? ''),
  };
  return jobFor(await mutateProject(id, (p) => ({ ...p, previews: { ...p.previews, [String(seq)]: preview } })), seq, '720x1280');
};

/** Records the finished render on the edit or the preview. */
export const completeJob = (job: Job, done: Partial<CopyViralEdit>) => {
  const finishedAt = new Date().toISOString();
  if (job.sequence !== null) return setPreview(job.id, job.sequence, { status: 'DONE', step: 'Done', video: done.video ?? null, finishedAt });
  return mutateProject(job.id, (p) => ({ ...p, status: 'READY', edit: p.edit && { ...p.edit, ...done, status: 'DONE', step: 'Done', finishedAt } }));
};

export const failJob = async (job: Job, err: unknown) => {
  const error = failMessage(err);
  const finishedAt = new Date().toISOString();
  console.error(`[copy-viral] ${job.id} ${job.dirName} failed:`, error);
  if (job.sequence !== null) return setPreview(job.id, job.sequence, { status: 'FAILED', error, finishedAt }).catch(() => undefined);
  return mutateProject(job.id, (p) => ({ ...p, status: 'READY', edit: p.edit && { ...p.edit, status: 'FAILED', error, finishedAt } })).catch(() => undefined);
};

/** Fixed rules, no AI: draft → render, in the background. */
const runAuto = (job: Job) => {
  void draftJob(job).then(() => renderJob(job)).then((done) => completeJob(job, done)).catch((err: unknown) => failJob(job, err));
};

/** Starts the full edit in the background. One at a time per project (the status is RENDERING meanwhile). */
export const startRender = async (id: string, resolution: CopyViralResolution, director: CopyViralDirector = 'auto') => {
  const job = await beginEdit(id, resolution, director);
  if (director === 'claude') return startClaudeDirector(job);
  runAuto(job);
};

/**
 * A quick 720 render of one sequence (its shots only), to check it while recording. Does not lock the project:
 * takes of other sequences can still be recorded meanwhile.
 */
export const startSequencePreview = async (id: string, seq: number, director: CopyViralDirector = 'auto') => {
  if ((await getProject(id)).previews[String(seq)]?.status === 'RUNNING') throw new HttpError(409, 'running', 'This preview is already rendering');
  const job = await beginPreview(id, seq, director);
  if (director === 'claude') return startClaudeDirector(job);
  runAuto(job);
};
