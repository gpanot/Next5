/**
 * GET    /api/admin/slideshow-knowledge/models/[modelId] — model + its example posts with slides
 * PATCH  /api/admin/slideshow-knowledge/models/[modelId] — { name?, niches?, status?, pattern? }
 * DELETE /api/admin/slideshow-knowledge/models/[modelId] — delete the model; its posts stay, unassigned
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../src/lib/db';
import { getModel, updateModel, type ModelPatch } from '../../../../../../src/server/slideshowKnowledge/store';

type Ctx = { params: Promise<{ modelId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { modelId } = await ctx.params;
  const model = await getModel(modelId);
  return model ? json({ model }) : json({ error: 'Model not found' }, { status: 404 });
});

export const PATCH = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { modelId } = await ctx.params;
  await updateModel(modelId, (await req.json().catch(() => ({}))) as ModelPatch);
  return json({ model: await getModel(modelId) });
});

export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { modelId } = await ctx.params;
  await prisma.slideshowModel.delete({ where: { id: modelId } });
  return json({ ok: true });
});
