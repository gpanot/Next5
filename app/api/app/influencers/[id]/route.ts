import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/influencers/[id]'>;

/** PATCH /api/app/influencers/:id — restore an archived influencer. Body: { status: 'active' } */
export const PATCH = authedRoute<Ctx>(async (req, session, ctx) => {
  const { id } = await ctx.params;
  const body = await readJsonObject(req);
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : 'brand');

  const influencer = await prisma.influencer.findFirst({ where: { id, workspaceId: ws.id } });
  if (!influencer) throw new HttpError(404, 'not_found', 'Influencer not found.');

  if (body.status === 'active') {
    await prisma.influencer.update({ where: { id }, data: { status: 'active' } });
    // Restore sets that were archived together with this influencer.
    await prisma.studioSet.updateMany({ where: { influencerId: id, status: 'archived' }, data: { status: 'active' } });
  }

  return NextResponse.json({ ok: true });
});

/** DELETE /api/app/influencers/:id — archive influencer and its sets. */
export const DELETE = authedRoute<Ctx>(async (req, session, ctx) => {
  const { id } = await ctx.params;
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : 'brand');

  const influencer = await prisma.influencer.findFirst({
    where: { id, workspaceId: ws.id },
  });
  if (!influencer) throw new HttpError(404, 'not_found', 'Influencer not found.');

  // Archive the influencer.
  await prisma.influencer.update({ where: { id }, data: { status: 'archived' } });

  // Archive all sets that were auto-created from this influencer.
  await prisma.studioSet.updateMany({
    where: { influencerId: id, status: { not: 'archived' } },
    data: { status: 'archived' },
  });

  return NextResponse.json({ ok: true });
});
