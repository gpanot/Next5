/**
 * GET    /api/admin/auto-slideshow/runs/[runId]/manual/[draftId] — { draft }
 * POST   — { action, ... } → { draft } : one wizard step.
 *          'another' another story from the bank · 'request' { request } the story changed by the chat box ·
 *          'text' { index, title, body } typed text on one slide · 'approve' the story: plans the photos, makes the
 *          first one · 'redo' { request } a new first photo (free redos are capped) · 'finish' the first photo
 *          accepted: the other photos are made in the background and the 1 credit is charged once it is ready.
 * DELETE — drops the draft.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { json } from '../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../src/server/autoSlideshow/access';
import { changeStory, discardDraft, getDraftDto } from '../../../../../../../../src/server/autoSlideshow/manual/draft';
import { approveStory, finishDraft, markFinishing, redoFirstPhoto } from '../../../../../../../../src/server/autoSlideshow/manual/photo';
import { requestOf } from '../../../../../../../../src/server/autoSlideshow/manual/rewrite';
import { slideshowRoute } from '../../../../../../../../src/server/autoSlideshow/route';
import { requireCredits } from '../../../../../../../../src/server/slideshowCredits/charge';

// One photo takes about 35 s, up to 3 min when reAPI is busy; Finish makes the others in the background.
export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string; draftId: string }> };
type Body = { action?: unknown; request?: unknown; index?: unknown; title?: unknown; body?: unknown };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, draftId } = await ctx.params;
  await assertRunAccess(access, runId);
  return json({ draft: await getDraftDto(runId, draftId) });
});

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, draftId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as Body;
  switch (body.action) {
    case 'another':
      return json({ draft: await changeStory(runId, draftId, { kind: 'another' }) });
    case 'request':
      return json({ draft: await changeStory(runId, draftId, { kind: 'request', request: requestOf(body.request) }) });
    case 'text':
      if (!Number.isInteger(body.index)) return json({ error: 'index must be a slide number' }, { status: 400 });
      return json({ draft: await changeStory(runId, draftId, { kind: 'text', index: body.index as number, title: body.title, body: body.body }) });
    case 'approve':
      return json({ draft: await approveStory(runId, draftId) });
    case 'redo':
      return json({ draft: await redoFirstPhoto(runId, draftId, requestOf(body.request)) });
    case 'finish':
      if (!access.admin) await requireCredits(access.userId, 1);
      await markFinishing(runId, draftId);
      waitUntil(finishDraft(runId, draftId));
      return json({ draft: await getDraftDto(runId, draftId) }, { status: 202 });
    default:
      return json({ error: 'Unknown action' }, { status: 400 });
  }
});

export const DELETE = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, draftId } = await ctx.params;
  await assertRunAccess(access, runId);
  await discardDraft(runId, draftId);
  return json({ ok: true });
});
