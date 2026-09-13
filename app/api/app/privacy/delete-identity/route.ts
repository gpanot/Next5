import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { readJsonObject } from '../../../../../src/server/http';
import { deleteObject } from '../../../../../src/server/storage/objectStore';

/** POST /api/app/privacy/delete-identity — deletes every identity photo the user uploaded (all workspaces). */
export const POST = authedRoute(async (req, session) => {
  await readJsonObject(req).catch(() => ({}));
  const refs = await prisma.identityReference.findMany({
    where: { workspace: { ownerUserId: session.userId }, deletedAt: null, isStudioModel: false },
    select: { id: true, r2Key: true },
  });
  await Promise.all(refs.map((ref) => deleteObject(ref.r2Key).catch((err: unknown) => console.error('[privacy] delete failed', ref.id, err))));
  await prisma.identityReference.updateMany({ where: { id: { in: refs.map((r) => r.id) } }, data: { deletedAt: new Date(), wavespeedUrl: null } });
  await prisma.consentRecord.create({ data: { userId: session.userId, type: 'face_processing_withdrawn', version: '2026-09' } });
  return NextResponse.json({ deleted: refs.length });
});
