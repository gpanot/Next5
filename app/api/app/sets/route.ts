import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { readJsonObject } from '../../../../src/server/http';
import { createSet, parseSetInput, toSetDto } from '../../../../src/server/sets/sets';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/sets?product= — active sets (archived excluded). */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  const sets = await prisma.studioSet.findMany({ where: { workspaceId: ws.id, status: { not: 'archived' } }, include: { template: true }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ sets: await Promise.all(sets.map(toSetDto)) });
});

/** POST /api/app/sets — { product, templateId, name?, locations?, wardrobe?, poseEnergy?, brandColors?, modelRef? } */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, isProductLine(body.product) ? body.product : undefined);
  const set = await createSet(ws, parseSetInput(body));
  const full = await prisma.studioSet.findUniqueOrThrow({ where: { id: set.id }, include: { template: true } });
  return NextResponse.json({ set: await toSetDto(full) }, { status: 201 });
});
