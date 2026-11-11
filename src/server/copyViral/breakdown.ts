// server-only — never import from a 'use client' file.
// Copy Viral Post, phase 2: what is said per shot, what each shot shows (Gemini), and Guillaume's new lines.
// Runs in the background after the cuts are fixed; a failure keeps the cuts and shows the error.

import type { CopyViralProject, CopyViralShot } from '../../types/admin/copyViral';
import { writeLines, type WrittenLines } from './script';
import { getProject, mutateProject, updateProject } from './store';
import { loadTranscript, shotTranscript, type HeardWord } from './transcript';
import { readShots } from './vision';

const sameBounds = (a: CopyViralShot, b: CopyViralShot) => a.startMs === b.startMs && a.endMs === b.endMs;

/** Reuses transcript.json: the reference never changes, only the cuts. */
const words = async (project: CopyViralProject): Promise<HeardWord[]> =>
  (await loadTranscript(project.id, project.reference ?? 'reference.mp4')).words;

/** Writes results onto the shots as they are now (the cuts may not move while READING, but stay safe). */
const saveResults = (id: string, done: CopyViralShot[], written: WrittenLines, extra: Partial<CopyViralProject>) =>
  mutateProject(id, (p) => ({
    ...p,
    ...extra,
    status: 'READY',
    error: null,
    myCaption: written.caption,
    shots: p.shots.map((s) => {
      const i = done.findIndex((d) => sameBounds(d, s));
      if (i < 0) return s;
      return { ...s, transcript: done[i].transcript, reading: done[i].reading, ...written.lines[i] };
    }),
  }));

const fail = (id: string) => async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[copy-viral] ${id} reading failed:`, message);
  await updateProject(id, { status: 'READY', error: message }).catch(() => undefined);
};

const runBreakdown = async (id: string) => {
  const project = await getProject(id);
  const heard = await words(project);
  const shots = project.shots.map((s) => ({ ...s, transcript: shotTranscript(heard, s) }));
  // Saved now, so the original lines show even if the reading below fails.
  await mutateProject(id, (p) => ({ ...p, shots: p.shots.map((s) => ({ ...s, transcript: shotTranscript(heard, s) })) }));
  const { readings, style } = await readShots(id, project.reference ?? 'reference.mp4', shots);
  const read = shots.map((s, i) => ({ ...s, reading: readings[i] }));
  await saveResults(id, read, await writeLines(read, style), { style });
};

const runRewrite = async (id: string) => {
  const project = await getProject(id);
  await saveResults(id, project.shots, await writeLines(project.shots, project.style), {});
};

/** Transcript + shot reading + new lines, in the background. */
export const startBreakdown = async (id: string) => {
  await updateProject(id, { status: 'READING', error: null });
  void runBreakdown(id).catch(fail(id));
};

/** New lines only, from the saved transcript and readings. */
export const startRewrite = async (id: string) => {
  await updateProject(id, { status: 'READING', error: null });
  void runRewrite(id).catch(fail(id));
};
