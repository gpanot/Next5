/**
 * POST   /api/admin/copy-viral/[id]/clips/[index]?startMs=… — body: the video file itself → the shot's clip (a retake
 *        replaces the earlier one, other shots stay as they are)
 * DELETE /api/admin/copy-viral/[id]/clips/[index]?startMs=… — removes the shot's clip
 * `startMs` guards against a shot list that changed meanwhile. Localhost only.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { removeClip, saveClip } from '../../../../../../../src/server/copyViral/clips';
import { copyViralRoute } from '../../../../../../../src/server/copyViral/route';
import { getProject } from '../../../../../../../src/server/copyViral/store';
import { isCopyViralBusy } from '../../../../../../../src/types/admin/copyViral';

type Ctx = { params: Promise<{ id: string; index: string }> };

const target = async (req: NextRequest, ctx: Ctx) => {
  const { id, index } = await ctx.params;
  return { id, index: Number(index), startMs: Number(req.nextUrl.searchParams.get('startMs')) };
};

export const POST = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id, index, startMs } = await target(req, ctx);
  if (!req.body) return json({ error: 'No video in the request' }, { status: 400 });
  if (isCopyViralBusy((await getProject(id)).status)) return json({ error: 'Wait until the project finishes running' }, { status: 409 });
  return json({ project: await saveClip(id, index, startMs, req.headers.get('content-type') ?? '', req.body) });
});

export const DELETE = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id, index, startMs } = await target(req, ctx);
  return json({ project: await removeClip(id, index, startMs) });
});
