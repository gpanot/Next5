import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/influencers/[id]'>;

/** DELETE /api/app/influencers/:id — archive influencer and its sets. */
export const DELETE = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { id } = await ctx.params;
  const ws = await requireWorkspace(session.userId);

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
