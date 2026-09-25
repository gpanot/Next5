import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError } from '../../../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';
import { prisma } from '../../../../../../src/lib/db';

type Ctx = RouteContext<'/api/app/library/uploads/[id]'>;

/**
 * DELETE /api/app/library/uploads/[id]?product=
 * Soft-deletes (archives) one user upload.
 */
export const DELETE = authedRoute<Ctx>(async (req, session, ctx) => {
  const { id } = await ctx.params;
  const p = new URL(req.url).searchParams;
  const product = p.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);

  const upload = await prisma.userUpload.findUnique({ where: { id } });
  if (!upload || upload.workspaceId !== ws.id) {
    throw new HttpError(404, 'not_found', 'Upload not found.');
  }

  await prisma.userUpload.update({ where: { id }, data: { archivedAt: new Date() } });
  return NextResponse.json({}, { status: 204 });
});
