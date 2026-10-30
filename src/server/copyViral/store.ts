// server-only — never import from a 'use client' file.
// Copy Viral Post projects on local disk: .data/copy-viral/<id>/project.json plus the project's media.
// The feature renders with a local engine (Chrome, whisper.cpp), so it only runs on Guillaume's Mac, never on Vercel.

import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'fs/promises';
import path from 'path';
import { HttpError } from '../http';
import { DEFAULT_CUT_THRESHOLD, type CopyViralProject } from '../../types/admin/copyViral';
import { emptyShot } from './shots';

const ROOT = () => path.join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'copy-viral');

/** Throws 404 off localhost: dev server, or COPY_VIRAL_LOCAL=1 on a local production build. */
export const assertLocal = () => {
  if (process.env.NODE_ENV === 'development' || process.env.COPY_VIRAL_LOCAL === '1') return;
  throw new HttpError(404, 'local_only', 'Copy Viral Post runs on localhost only');
};

const ID_RE = /^[a-z0-9-]{8,64}$/;

export const projectDir = (id: string) => {
  if (!ID_RE.test(id)) throw new HttpError(400, 'bad_id', 'Bad project id');
  return path.join(ROOT(), id);
};

/** A file inside a project folder; refuses paths that climb out of it. */
export const projectFile = (id: string, rel: string) => {
  const dir = projectDir(id);
  const file = path.resolve(dir, rel);
  if (!file.startsWith(dir + path.sep)) throw new HttpError(400, 'bad_path', 'Bad file path');
  return file;
};

export const readProject = async (id: string): Promise<CopyViralProject | null> => {
  const file = path.join(projectDir(id), 'project.json');
  if (!existsSync(file)) return null;
  const raw = JSON.parse(await readFile(file, 'utf8')) as CopyViralProject;
  // Projects made before a field existed get its empty value.
  return {
    ...raw,
    cutThreshold: raw.cutThreshold ?? DEFAULT_CUT_THRESHOLD,
    // projects made before sentence cuts keep the picture cuts they were edited with
    cutMode: raw.cutMode ?? 'pictures',
    style: raw.style ?? null,
    myCaption: raw.myCaption ?? '',
    previews: raw.previews ?? {},
    steal: raw.steal ?? null,
    edit: raw.edit ? { ...raw.edit, resolution: raw.edit.resolution === '720x1280' ? '720x1280' : '1080x1920' } : null,
    shots: raw.shots.map((s) => ({
      ...emptyShot(s.index, s.startMs, s.endMs, s.targetMs, s.index),
      ...s,
      reading: s.reading ? { ...s.reading, background: s.reading.background ?? '' } : null,
    })),
  };
};

export const getProject = async (id: string): Promise<CopyViralProject> => {
  const project = await readProject(id);
  if (!project) throw new HttpError(404, 'not_found', 'Project not found');
  return project;
};

/** Writes through a temp file, so a poll never reads half a project. */
export const saveProject = async (project: CopyViralProject): Promise<CopyViralProject> => {
  const next = { ...project, updatedAt: new Date().toISOString() };
  const file = path.join(projectDir(project.id), 'project.json');
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(next, null, 2));
  await rename(tmp, file);
  return next;
};

/** One change at a time per project: background steps and the tab's edits read, change and write the same file. */
const queues = new Map<string, Promise<unknown>>();

/** Reads the project fresh, applies `change`, saves. Queued behind every other change to the same project. */
export const mutateProject = (id: string, change: (p: CopyViralProject) => CopyViralProject | Promise<CopyViralProject>) => {
  const run = (queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(async () => saveProject(await change(await getProject(id))));
  queues.set(id, run);
  void run.finally(() => queues.get(id) === run && queues.delete(id)).catch(() => undefined);
  return run;
};

export const updateProject = (id: string, patch: Partial<CopyViralProject>) => mutateProject(id, (p) => ({ ...p, ...patch }));

export const createProject = async (title: string, referenceUrl: string | null): Promise<CopyViralProject> => {
  const id = randomUUID();
  await mkdir(projectDir(id), { recursive: true });
  const now = new Date().toISOString();
  return saveProject({
    id, title, referenceUrl, status: 'DOWNLOADING', error: null, reference: null,
    durationMs: 0, width: 0, height: 0, fps: 0, cutThreshold: DEFAULT_CUT_THRESHOLD, cutMode: 'sentences', style: null, myCaption: '', edit: null, steal: null, previews: {}, shots: [], createdAt: now, updatedAt: now,
  });
};

export const listProjects = async (): Promise<CopyViralProject[]> => {
  if (!existsSync(ROOT())) return [];
  const ids = (await readdir(ROOT(), { withFileTypes: true })).filter((d) => d.isDirectory() && ID_RE.test(d.name)).map((d) => d.name);
  const projects = await Promise.all(ids.map((id) => readProject(id).catch(() => null)));
  return projects.filter((p): p is CopyViralProject => p !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const deleteProject = async (id: string) => rm(projectDir(id), { recursive: true, force: true });
