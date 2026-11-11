/**
 * Copy Viral Post from Claude Code: the steps the /copy-viral-render skill runs (Claude Code is the director).
 *
 * Usage (from the repo root):
 *   npx tsx scripts/copy-viral.ts info    <projectId> [--sequence N] [--resolution 720x1280|1080x1920]
 *   npx tsx scripts/copy-viral.ts draft   <projectId> [--sequence N] [--resolution …]   join takes, words, spec, prepare
 *   npx tsx scripts/copy-viral.ts compare <projectId> [--sequence N]                    fresh stills, original | mine sheets,
 *                                                                                       face size/position vs original + cutout fix
 *   npx tsx scripts/copy-viral.ts render  <projectId> [--sequence N] [--resolution …]   render, .srt, mark done
 *   npx tsx scripts/copy-viral.ts fail    <projectId> [--sequence N] "why"              mark failed
 *
 * The /copy-viral-steal skill (the reel's look, measured once):
 *   npx tsx scripts/copy-viral.ts steal-info <projectId>             paths: reference, work folder, stolen/, skill refs
 *   npx tsx scripts/copy-viral.ts steal-done <projectId> "summary"   checks stolen/ and marks it done
 *   npx tsx scripts/copy-viral.ts steal-fail <projectId> "why"       marks it failed
 *
 * --sequence N (1-based) = the quick preview of that sequence (720 by default); without it, the full edit.
 * Paths printed are absolute. Runs locally only (the engine needs Chrome and whisper.cpp on this Mac).
 */
import { existsSync } from 'fs';
import path from 'path';
import { compareSheets } from '../src/server/copyViral/director';
import { measureShots } from '../src/server/copyViral/measure';
import { beginEdit, beginPreview, completeJob, draftJob, failJob, jobFor, renderJob, type Job } from '../src/server/copyViral/render';
import { EXAMPLE_SCENES } from '../src/server/copyViral/setups';
import { failSteal, finishSteal, STEAL_DIR } from '../src/server/copyViral/steal';
import { getProject, projectFile } from '../src/server/copyViral/store';
import type { CopyViralResolution } from '../src/types/admin/copyViral';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const [command, id] = process.argv.slice(2);
const seqArg = arg('sequence');
const sequence = seqArg ? Number(seqArg) - 1 : null;
const resolution: CopyViralResolution = (arg('resolution') as CopyViralResolution | undefined) ?? (sequence !== null ? '720x1280' : '1080x1920');

const abs = (rel: string | null) => (rel ? projectFile(id, rel) : null);

/** The job as the server left it (started from the admin tab), else started now (started by hand in Claude Code). */
const currentJob = async (start: boolean): Promise<Job> => {
  const project = await getProject(id);
  const running = sequence === null ? project.edit?.status === 'RUNNING' : project.previews[String(sequence)]?.status === 'RUNNING';
  if (running || !start) return jobFor(project, sequence, resolution);
  return sequence === null ? beginEdit(id, resolution, 'claude') : beginPreview(id, sequence, 'claude');
};

const info = async () => {
  const project = await getProject(id);
  const job = jobFor(project, sequence, resolution);
  const dir = projectFile(id, job.dirName);
  return {
    title: project.title,
    job: sequence === null ? 'full edit' : `preview of sequence ${sequence + 1}`,
    resolution,
    reference: abs(project.reference),
    referenceSize: `${project.width}x${project.height}`,
    style: project.style,
    // the measured look (/copy-viral-steal), used in place of `style` when present
    stolen: project.steal?.status === 'DONE' ? { styleJson: projectFile(id, `${STEAL_DIR}/style.json`), notes: projectFile(id, `${STEAL_DIR}/STYLE.md`) } : null,
    engineDir: dir,
    spec: path.join(dir, 'source', 'spec.js'),
    styleJson: path.join(dir, 'source', 'style.json'),
    words: path.join(dir, 'files', 'words.md'),
    shots: job.shots.map((s) => ({
      shot: s.index + 1,
      sequence: s.sequence + 1,
      originalMs: [s.startMs, s.endMs],
      targetMs: s.targetMs,
      originalStills: [25, 50, 75].map((pc) => projectFile(id, `stills/shot-${s.startMs}-${s.endMs}-${pc}.jpg`)),
      originalFrame: abs(s.frame),
      reading: s.reading,
      saidInOriginal: s.transcript,
      myLine: s.myLine,
      myOnScreenText: s.myOnScreenText,
      myTake: s.clip && { file: abs(s.clip.file), durationMs: s.clip.durationMs, size: `${s.clip.width}x${s.clip.height}` },
      background: abs(s.background),
    })),
  };
};

const ENGINE = path.join(process.cwd(), 'tools', 'video-agent-engine');
const HOME = process.env.HOME ?? '';

const stealInfo = async () => {
  const project = await getProject(id);
  return {
    title: project.title,
    // boards = the look is already in `out` (a saved setup): write scenes.json only
    mode: project.steal?.mode ?? 'measure',
    setup: project.steal?.setup ?? null,
    exampleScenes: existsSync(projectFile(id, `${STEAL_DIR}/${EXAMPLE_SCENES}`)) ? projectFile(id, `${STEAL_DIR}/${EXAMPLE_SCENES}`) : null,
    reference: abs(project.reference),
    durationMs: project.durationMs,
    size: `${project.width}x${project.height}`,
    work: projectFile(id, 'steal-work'),
    out: projectFile(id, STEAL_DIR),
    stealSkill: path.join(HOME, '.claude', 'skills', 'steal', 'SKILL.md'),
    learnings: path.join(HOME, '.claude', 'skills', 'steal', 'references', 'learnings.md'),
    styleSchema: path.join(ENGINE, 'references', 'style-schema.md'),
    styleGuide: path.join(ENGINE, 'references', 'style.md'),
    sfxGuide: path.join(ENGINE, 'references', 'sfx.md'),
    sfxLibrary: path.join(ENGINE, 'assets', 'sfx'),
    looks: path.join(ENGINE, 'assets', 'looks.json'),
    sceneLibrary: path.join(ENGINE, 'references', 'scene-library.md'),
    designSystem: path.join(ENGINE, 'references', 'design-system.md'),
    // per shot, as the edit will lay it out (the layout is per shot and stays Gemini's), with Guillaume's words: the
    // boards of scenes.json say HIS content, in the original's look and rhythm
    shots: project.shots.map((s) => ({
      shot: s.index + 1, sequence: s.sequence + 1, ms: [s.startMs, s.endMs], originalStills: [25, 50, 75].map((pc) => projectFile(id, `stills/shot-${s.startMs}-${s.endMs}-${pc}.jpg`)),
      layout: s.reading?.layout ?? null, facePct: s.reading?.facePct ?? null, overlays: s.reading?.overlays ?? '', originalOnScreenText: s.reading?.onScreenText ?? '',
      said: s.transcript, myLine: s.myLine, myOnScreenText: s.myOnScreenText, pictureBehindMe: !!s.background,
    })),
  };
};

const lastArg = () => process.argv.slice(4).filter((a) => !a.startsWith('--')).pop();

const main = async () => {
  if (!command || !id) throw new Error('Usage: npx tsx scripts/copy-viral.ts <info|draft|compare|render|fail> <projectId> [--sequence N]');
  if (command === 'steal-info') return console.log(JSON.stringify(await stealInfo(), null, 2));
  if (command === 'steal-done') {
    await finishSteal(id, lastArg() ?? '');
    return console.log('marked done: every edit now uses stolen/style.json');
  }
  if (command === 'steal-fail') {
    await failSteal(id, lastArg() ?? 'Stopped by Claude Code');
    return console.log('marked failed');
  }
  if (command === 'info') return console.log(JSON.stringify(await info(), null, 2));
  if (command === 'draft') {
    const job = await currentJob(true);
    const spans = await draftJob(job);
    await job.step('Claude Code: comparing with the original…');
    return console.log(JSON.stringify({ engineDir: projectFile(id, job.dirName), spans, next: 'edit source/spec.js, then compare' }, null, 2));
  }
  if (command === 'compare') {
    const job = await currentJob(false);
    const sheets = await compareSheets(job);
    return console.log(JSON.stringify({ ...sheets, measure: await measureShots(job) }, null, 2));
  }
  if (command === 'render') {
    const job = await currentJob(false);
    const done = await renderJob(job);
    await completeJob(job, done);
    return console.log(JSON.stringify({ video: abs(done.video ?? null), durationMs: done.durationMs }, null, 2));
  }
  if (command === 'fail') {
    await failJob(await currentJob(false), new Error(process.argv.slice(4).filter((a) => !a.startsWith('--')).pop() ?? 'Stopped by Claude Code'));
    return console.log('marked failed');
  }
  throw new Error(`Unknown command ${command}`);
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
