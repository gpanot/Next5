// server-only — never import from a 'use client' file.
// Saved setups: a measured look (stolen/ of a project) kept in .data/copy-viral-setups/<slug>/ to reuse on another reel
// of the same creator, instead of measuring again (10 to 15 min of Claude Code). The look is reused as is; its
// scenes.json is kept as example-scenes.json, since board animations are written for one reel's shots and lines.

import { existsSync } from 'fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { HttpError } from '../http';
import type { CopyViralSetup } from '../../types/admin/copyViral';
import { STEAL_DIR } from './steal';
import { getProject, mutateProject, projectFile } from './store';

const ROOT = () => path.join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'copy-viral-setups');
const META = 'setup.json';
/** Files a setup keeps; scenes.json becomes the example. */
const KEEP = ['style.json', 'STYLE.md', 'hints.json', 'stills', 'assets'];
export const EXAMPLE_SCENES = 'example-scenes.json';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'setup';

export const setupDir = (slug: string) => {
  if (!SLUG_RE.test(slug)) throw new HttpError(400, 'bad_setup', 'Bad setup name');
  return path.join(ROOT(), slug);
};

export const listSetups = async (): Promise<CopyViralSetup[]> => {
  if (!existsSync(ROOT())) return [];
  const dirs = (await readdir(ROOT(), { withFileTypes: true })).filter((d) => d.isDirectory() && SLUG_RE.test(d.name));
  const all = await Promise.all(dirs.map(async (d) => JSON.parse(await readFile(path.join(ROOT(), d.name, META), 'utf8')) as CopyViralSetup).map((p) => p.catch(() => null)));
  return all.filter((s): s is CopyViralSetup => s !== null).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
};

/** Saves the project's measured look under `name` (same name = replaced). */
export const saveSetup = async (projectId: string, name: string): Promise<CopyViralSetup> => {
  const project = await getProject(projectId);
  if (project.steal?.status !== 'DONE') throw new HttpError(409, 'not_measured', 'Measure the look on this reel first');
  const slug = slugify(name);
  const dir = setupDir(slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const file of KEEP) {
    if (existsSync(projectFile(projectId, `${STEAL_DIR}/${file}`))) await cp(projectFile(projectId, `${STEAL_DIR}/${file}`), path.join(dir, file), { recursive: true });
  }
  if (existsSync(projectFile(projectId, `${STEAL_DIR}/scenes.json`))) await cp(projectFile(projectId, `${STEAL_DIR}/scenes.json`), path.join(dir, EXAMPLE_SCENES));
  const setup: CopyViralSetup = { slug, name: name.trim().slice(0, 80), fromProject: projectId, fromTitle: project.title, summary: project.steal.summary, savedAt: new Date().toISOString() };
  await writeFile(path.join(dir, META), JSON.stringify(setup, null, 2));
  await mutateProject(projectId, (p) => (p.steal ? { ...p, steal: { ...p.steal, setup: setup.name } } : p));
  return setup;
};

export const deleteSetup = (slug: string) => rm(setupDir(slug), { recursive: true, force: true });

/**
 * Puts a saved setup's look on a project: its files become the project's stolen/ with no boards yet (plain on-screen
 * texts) and the look counts as done. "Write the boards" then adds this reel's board animations.
 */
export const applySetup = async (projectId: string, slug: string) => {
  const dir = setupDir(slug);
  if (!existsSync(path.join(dir, META))) throw new HttpError(404, 'no_setup', 'Saved setup not found');
  const setup = JSON.parse(await readFile(path.join(dir, META), 'utf8')) as CopyViralSetup;
  const out = projectFile(projectId, STEAL_DIR);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const file of [...KEEP, EXAMPLE_SCENES]) {
    if (existsSync(path.join(dir, file))) await cp(path.join(dir, file), path.join(out, file), { recursive: true });
  }
  await writeFile(path.join(out, 'scenes.json'), JSON.stringify({ shots: {} }, null, 2));
  const now = new Date().toISOString();
  return mutateProject(projectId, (p) => ({
    ...p,
    steal: { status: 'DONE', startedAt: now, finishedAt: now, error: null, summary: `Saved setup "${setup.name}" (measured on ${setup.fromTitle}).\n${setup.summary}`, mode: 'measure', setup: setup.name, boards: 0 },
  }));
};
