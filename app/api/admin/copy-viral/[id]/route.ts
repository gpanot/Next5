/**
 * GET    /api/admin/copy-viral/[id] — one project (status, reference, shots) and its folder on disk
 * POST   /api/admin/copy-viral/[id] — { action: 'reanalyze', threshold?, cutMode? } → find the cuts again from the saved reference
 *                                     { action: 'read' }    → transcript, Gemini shot reading and Guillaume's new lines
 *                                     { action: 'rewrite' } → new lines only, from the saved reading
 *                                     { action: 'preview', sequence, director? } → quick 720 render of one sequence from my takes
 *                                       (director 'claude' = the /copy-viral-render skill runs headless and matches the original)
 *                                     { action: 'render', resolution?, director? } → joins my takes and edits them with the local engine
 *                                     { action: 'steal', boards? } → Claude Code measures the reel's look (/copy-viral-steal), used by every
 *                                       edit after; boards = keeps the look (a saved setup) and writes this reel's board animations only
 *                                     { action: 'useSetup', setup } → a saved setup's look on this reel, no boards yet
 * PATCH  /api/admin/copy-viral/[id] — { myCaption } → saves the post caption
 * DELETE /api/admin/copy-viral/[id] — removes the project folder
 * Localhost only.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../src/server/admin/route';
import { startBreakdown, startRewrite } from '../../../../../src/server/copyViral/breakdown';
import { startRender, startSequencePreview } from '../../../../../src/server/copyViral/render';
import { reanalyze, referenceExists } from '../../../../../src/server/copyViral/pipeline';
import { copyViralRoute } from '../../../../../src/server/copyViral/route';
import { applySetup } from '../../../../../src/server/copyViral/setups';
import { startSteal } from '../../../../../src/server/copyViral/steal';
import { deleteProject, getProject, projectDir, updateProject } from '../../../../../src/server/copyViral/store';
import { isCopyViralBusy } from '../../../../../src/types/admin/copyViral';

type Ctx = { params: Promise<{ id: string }> };

export const GET = copyViralRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  return json({ project: await getProject(id), dir: projectDir(id) });
});

export const POST = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; threshold?: unknown; resolution?: unknown; cutMode?: unknown; sequence?: unknown; director?: unknown; boards?: unknown; setup?: unknown };
  const director = body.director === 'claude' ? 'claude' : 'auto';
  const project = await getProject(id);
  if (isCopyViralBusy(project.status)) return json({ error: 'This project is still running' }, { status: 409 });
  if (body.action === 'read') {
    await startBreakdown(id);
    return json({ ok: true });
  }
  if (body.action === 'rewrite') {
    if (!project.shots.some((s) => s.reading)) return json({ error: 'Read the shots first' }, { status: 409 });
    await startRewrite(id);
    return json({ ok: true });
  }
  if (body.action === 'preview') {
    if (typeof body.sequence !== 'number') return json({ error: 'sequence is required' }, { status: 400 });
    await startSequencePreview(id, body.sequence, director);
    return json({ ok: true });
  }
  if (body.action === 'steal') {
    if (!project.reference) return json({ error: 'No reference video saved' }, { status: 409 });
    if (project.steal?.status === 'RUNNING') return json({ error: 'Already measuring the look' }, { status: 409 });
    // the board animations are written for my lines, so they must exist first
    if (!project.shots.some((s) => s.myLine.trim())) return json({ error: 'Read the shots and write my lines first' }, { status: 409 });
    await startSteal(id, body.boards === true ? 'boards' : 'measure');
    return json({ ok: true });
  }
  if (body.action === 'useSetup') {
    if (typeof body.setup !== 'string') return json({ error: 'setup is required' }, { status: 400 });
    if (project.steal?.status === 'RUNNING') return json({ error: 'Wait for the measuring to finish' }, { status: 409 });
    return json({ project: await applySetup(id, body.setup) });
  }
  if (body.action === 'render') {
    const missing = project.shots.filter((s) => !s.clip).map((s) => s.index + 1);
    if (missing.length) return json({ error: `Upload a take for shot ${missing.join(', ')} first` }, { status: 409 });
    await startRender(id, body.resolution === '720x1280' ? '720x1280' : '1080x1920', director);
    return json({ ok: true });
  }
  if (body.action !== 'reanalyze') return json({ error: 'Unknown action' }, { status: 400 });
  if (!referenceExists(id)) return json({ error: 'No reference video saved: create a new project' }, { status: 409 });
  const threshold = typeof body.threshold === 'number' && body.threshold >= 1 && body.threshold <= 50 ? body.threshold : project.cutThreshold;
  const cutMode = body.cutMode === 'pictures' || body.cutMode === 'sentences' ? body.cutMode : project.cutMode;
  await reanalyze(id, threshold, cutMode);
  return json({ ok: true });
});

export const PATCH = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { myCaption?: unknown };
  if (typeof body.myCaption !== 'string') return json({ error: 'myCaption is required' }, { status: 400 });
  return json({ project: await updateProject(id, { myCaption: body.myCaption.slice(0, 4000) }) });
});

export const DELETE = copyViralRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteProject(id);
  return json({ ok: true });
});
