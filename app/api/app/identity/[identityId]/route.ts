import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError } from '../../../../../src/server/http';
import { deleteObject } from '../../../../../src/server/storage/objectStore';

type Ctx = RouteContext<'/api/app/identity/[identityId]'>;

/** DELETE /api/app/identity/[identityId] — removes one identity photo. */
export const DELETE = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { identityId } = await ctx.params;
  const ref = await prisma.identityReference.findFirst({ where: { id: identityId, deletedAt: null, workspace: { ownerUserId: session.userId } } });
  if (!ref) throw new HttpError(404, 'identity_not_found', 'Photo not found.');
  await deleteObject(ref.r2Key).catch(() => undefined);
  await prisma.identityReference.update({ where: { id: ref.id }, data: { deletedAt: new Date(), wavespeedUrl: null } });
  return NextResponse.json({ deleted: true });
});
