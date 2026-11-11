/** GET /api/admin/script-generator/drafts/[id] — one saved script with signed photo links.
 *  PATCH { script?, chat?, model? } — autosave. DELETE — removes the script and its photos. */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { deleteDraft, getDraft, saveDraft } from '../../../../../../src/server/scriptGenerator/drafts';

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => json({ draft: await getDraft((await ctx.params).id) }));

export const PATCH = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ draft: await saveDraft((await ctx.params).id, body) });
});

export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  await deleteDraft((await ctx.params).id);
  return json({ ok: true });
});
