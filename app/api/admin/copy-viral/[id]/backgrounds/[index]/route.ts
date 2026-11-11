/**
 * POST   /api/admin/copy-viral/[id]/backgrounds/[index]?startMs=…
 *        JSON { action: 'generate', description? } → a picture from the shot's background description (Nano Banana 2 Lite, $0.015), for the shot's whole sequence
 *        JSON { action: 'previous' }               → the same picture as the sequence before
 *        an image body (JPG, PNG, WebP)            → my own picture
 * DELETE /api/admin/copy-viral/[id]/backgrounds/[index]?startMs=… → back to my real room
 * The picture goes behind me in the edit (cut out with Apple Vision). `startMs` guards against changed shots. Localhost only.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { copyPreviousBackground, generateBackground, removeBackground, uploadBackground } from '../../../../../../../src/server/copyViral/backgrounds';
import { copyViralRoute } from '../../../../../../../src/server/copyViral/route';
import { getProject } from '../../../../../../../src/server/copyViral/store';
import { isCopyViralBusy } from '../../../../../../../src/types/admin/copyViral';

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string; index: string }> };

const target = async (req: NextRequest, ctx: Ctx) => {
  const { id, index } = await ctx.params;
  return { id, index: Number(index), startMs: Number(req.nextUrl.searchParams.get('startMs')) };
};

export const POST = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id, index, startMs } = await target(req, ctx);
  if (isCopyViralBusy((await getProject(id)).status)) return json({ error: 'Wait until the project finishes running' }, { status: 409 });
  const type = req.headers.get('content-type') ?? '';
  if (type.startsWith('application/json')) {
    const body = (await req.json().catch(() => ({}))) as { action?: unknown; description?: unknown };
    if (body.action === 'previous') return json({ project: await copyPreviousBackground(id, index, startMs) });
    if (body.action !== 'generate') return json({ error: 'Unknown action' }, { status: 400 });
    return json({ project: await generateBackground(id, index, startMs, typeof body.description === 'string' ? body.description : undefined) });
  }
  if (!req.body) return json({ error: 'No image in the request' }, { status: 400 });
  return json({ project: await uploadBackground(id, index, startMs, type, req.body) });
});

export const DELETE = copyViralRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id, index, startMs } = await target(req, ctx);
  return json({ project: await removeBackground(id, index, startMs) });
});
