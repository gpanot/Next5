/**
 * PATCH /api/admin/copy-viral/[id]/shots/[index] — { startMs, myLine?, myOnScreenText? } → saves Guillaume's edits to
 *       one shot's line or on-screen text.
 * POST  /api/admin/copy-viral/[id]/shots/[index] — { startMs, action: 'merge' } → this shot and the next become one take
 *                                                  { startMs, action: 'split' } → split at the sentence end nearest its middle
 *       Lines are kept; takes of the changed shots are deleted. New stills are taken.
 * `startMs` guards against a shot list that changed meanwhile. Localhost only.
 */
import { rm } from 'fs/promises';
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../../src/server/http';
import { joinWithNext, splitInTwo, splitPointMs } from '../../../../../../../src/server/copyViral/joinShots';
import { ensureFrames } from '../../../../../../../src/server/copyViral/pipeline';
import { copyViralRoute } from '../../../../../../../src/server/copyViral/route';
import { getProject, mutateProject, projectFile } from '../../../../../../../src/server/copyViral/store';
import { loadTranscript, sentenceBreaks, shotTranscript } from '../../../../../../../src/server/copyViral/transcript';

type Ctx = { params: Promise<{ id: string; index: string }> };

const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, 2000) : undefined);

export const PATCH = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id, index: raw } = await ctx.params;
  const index = Number(raw);
  const body = (await req.json().catch(() => ({}))) as { startMs?: unknown; myLine?: unknown; myOnScreenText?: unknown };
  const myLine = text(body.myLine);
  const myOnScreenText = text(body.myOnScreenText);
  const project = await mutateProject(id, (p) => {
    const shot = p.shots[index];
    if (!shot || shot.startMs !== body.startMs) throw new HttpError(409, 'shots_changed', 'The shots changed: reload the page');
    const next = { ...shot, ...(myLine !== undefined ? { myLine } : {}), ...(myOnScreenText !== undefined ? { myOnScreenText } : {}) };
    return { ...p, shots: p.shots.map((s, i) => (i === index ? next : s)) };
  });
  return json({ project });
});

export const POST = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id, index: raw } = await ctx.params;
  const index = Number(raw);
  const body = (await req.json().catch(() => ({}))) as { startMs?: unknown; action?: unknown };
  if (body.action !== 'merge' && body.action !== 'split') return json({ error: "action must be 'merge' or 'split'" }, { status: 400 });
  const current = await getProject(id);
  if (current.status !== 'READY') return json({ error: 'Wait until the project finishes running' }, { status: 409 });
  const transcript = await loadTranscript(id, current.reference ?? 'reference.mp4');
  let dropped: string[] = [];
  const project = await mutateProject(id, async (p) => {
    const shot = p.shots[index];
    if (!shot || shot.startMs !== body.startMs) throw new HttpError(409, 'shots_changed', 'The shots changed: reload the page');
    let change;
    try {
      change = body.action === 'merge'
        ? joinWithNext(p.shots, index)
        : splitInTwo(p.shots, index, splitPointMs(shot, sentenceBreaks(transcript)), (s) => shotTranscript(transcript.words, s));
    } catch (err) {
      throw new HttpError(400, 'bad_change', err instanceof Error ? err.message : 'Bad change');
    }
    dropped = change.droppedClips;
    return { ...p, shots: await ensureFrames(id, change.shots) };
  });
  await Promise.all(dropped.map((f) => rm(projectFile(id, f), { force: true })));
  return json({ project });
});
