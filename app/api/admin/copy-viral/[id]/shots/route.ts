/**
 * PUT /api/admin/copy-viral/[id]/shots — { shots: [{ startMs, endMs, targetMs }] } → the corrected shot list
 * (merged, split or moved boundaries, new targets). New stills are taken for shots whose boundaries moved.
 * Localhost only.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../src/server/admin/route';
import { ensureFrames } from '../../../../../../src/server/copyViral/pipeline';
import { copyViralRoute } from '../../../../../../src/server/copyViral/route';
import { applyShotEdits } from '../../../../../../src/server/copyViral/shots';
import { loadTranscript, shotTranscript } from '../../../../../../src/server/copyViral/transcript';
import { getProject, saveProject } from '../../../../../../src/server/copyViral/store';
import type { CopyViralShotEdit } from '../../../../../../src/types/admin/copyViral';

type Ctx = { params: Promise<{ id: string }> };

const isEdit = (v: unknown): v is CopyViralShotEdit => {
  const e = v as Record<string, unknown> | null;
  return !!e && ['startMs', 'endMs', 'targetMs'].every((k) => typeof e[k] === 'number' && Number.isFinite(e[k]));
};

export const PUT = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { shots?: unknown };
  if (!Array.isArray(body.shots) || !body.shots.every(isEdit)) return json({ error: 'shots must be a list of { startMs, endMs, targetMs }' }, { status: 400 });
  const project = await getProject(id);
  if (project.status !== 'READY') return json({ error: 'Wait for the analysis to finish' }, { status: 409 });
  let shots;
  try {
    shots = applyShotEdits(body.shots, project.durationMs, project.shots);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Bad shot list' }, { status: 400 });
  }
  // new shots get their words now, so the cut editor shows what is said in each
  const { words } = await loadTranscript(id, project.reference ?? 'reference.mp4');
  const said = shots.map((s) => (s.transcript ? s : { ...s, transcript: shotTranscript(words, s) }));
  return json({ project: await saveProject({ ...project, shots: await ensureFrames(id, said) }) });
});
