import { NextResponse } from 'next/server';
import type { IdentityKind } from '@prisma/client';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { enforceRateLimit } from '../../../../src/server/rateLimit';
import { HttpError } from '../../../../src/server/http';
import { identityKey } from '../../../../src/server/storage/keys';
import { normalizeUpload, readForm } from '../../../../src/server/storage/images';
import { deleteObject, presignObject, putObject } from '../../../../src/server/storage/objectStore';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

const MAX_REFS = 3;

const listRefs = async (workspaceId: string) => {
  const refs = await prisma.identityReference.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
  return Promise.all(refs.map(async (r) => ({ id: r.id, kind: r.kind, url: await presignObject(r.r2Key), createdAt: r.createdAt.toISOString() })));
};

/** GET /api/app/identity?product= — the user's identity photos. */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  return NextResponse.json({ identities: await listRefs(ws.id) });
});

/**
 * POST /api/app/identity — multipart: product, replace ("true" replaces all), files[] + kinds[] (face | full_body).
 * Requires a face_processing consent.
 */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`identity:${session.userId}`, 20, 86400);
  const form = await readForm(req);
  const product = form.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  const consent = await prisma.consentRecord.findFirst({ where: { userId: session.userId, type: 'face_processing' }, orderBy: { acceptedAt: 'desc' } });
  const withdrawn = await prisma.consentRecord.findFirst({ where: { userId: session.userId, type: 'face_processing_withdrawn', acceptedAt: { gt: consent?.acceptedAt ?? new Date(0) } } });
  if (!consent || withdrawn) throw new HttpError(403, 'consent_required', 'Agree to face processing before uploading photos of yourself.');

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  const kinds = form.getAll('kinds').map(String);
  if (files.length === 0 || files.length > MAX_REFS) throw new HttpError(400, 'invalid_files', `Upload 1 to ${MAX_REFS} photos.`);

  const buffers = await Promise.all(files.map((f, i) => normalizeUpload(f, `photo ${i + 1}`)));
  if (form.get('replace') === 'true') {
    const old = await prisma.identityReference.findMany({ where: { workspaceId: ws.id, deletedAt: null } });
    await Promise.all(old.map((r) => deleteObject(r.r2Key).catch(() => undefined)));
    await prisma.identityReference.updateMany({ where: { id: { in: old.map((r) => r.id) } }, data: { deletedAt: new Date(), wavespeedUrl: null } });
  }
  for (const [i, buffer] of buffers.entries()) {
    const kind: IdentityKind = kinds[i] === 'full_body' ? 'full_body' : 'face';
    const ref = await prisma.identityReference.create({ data: { workspaceId: ws.id, kind, r2Key: 'pending' } });
    const key = identityKey(ws.id, ref.id);
    await putObject(key, buffer);
    await prisma.identityReference.update({ where: { id: ref.id }, data: { r2Key: key } });
  }
  return NextResponse.json({ identities: await listRefs(ws.id) }, { status: 201 });
});
