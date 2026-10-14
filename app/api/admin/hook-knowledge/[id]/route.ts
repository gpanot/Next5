/**
 * PATCH  /api/admin/hook-knowledge/[id] — { title, body, fileName? } → { entry }.
 * DELETE /api/admin/hook-knowledge/[id] — removes the entry.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { deleteKnowledge, parseKnowledge, updateKnowledge } from '../../../../../src/server/hookKnowledge/store';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  return json({ entry: await updateKnowledge(id, parseKnowledge(await req.json().catch(() => ({})))) });
});

export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteKnowledge(id);
  return json({ ok: true });
});
