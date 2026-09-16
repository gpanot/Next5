import { NextResponse } from 'next/server';
import { STUDIO_MODELS } from '../../../../src/content/business/catalog/studioModels';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { getActivePlan } from '../../../../src/server/generation/createBatch';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/studio-models — seeded models; Starter/no plan may use one model (the first one they pick). */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'shop');
  const seeded = new Set((await prisma.identityReference.findMany({ where: { isStudioModel: true, deletedAt: null }, select: { studioModelSlug: true } })).map((r) => r.studioModelSlug));
  const plan = await getActivePlan(ws.id);
  const used = (await prisma.studioSet.findMany({ where: { workspaceId: ws.id, status: { not: 'archived' }, modelRef: { not: 'me' } }, select: { modelRef: true } })).map((s) => s.modelRef);
  const chosen = used.find(Boolean) ?? null;
  const models = STUDIO_MODELS.filter((m) => seeded.has(m.slug)).map((m) => ({
    slug: m.slug, name: m.name, age: m.age, ethnicity: m.ethnicity, description: m.description, faceImage: m.faceImage,
    available: Boolean(plan?.allStudioModels) || !chosen || chosen === m.slug,
  }));
  return NextResponse.json({ models, allModels: Boolean(plan?.allStudioModels) });
});
