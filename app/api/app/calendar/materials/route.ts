import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import {
  MAX_MATERIALS_PER_UPLOAD,
  addMaterial,
  isMaterialKind,
  listMaterials,
  toMaterialDto,
} from '../../../../../src/server/calendar/materials';
import { HttpError } from '../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { normalizeUpload, readForm } from '../../../../../src/server/storage/images';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const list = async (workspaceId: string) =>
  NextResponse.json({ materials: await Promise.all((await listMaterials(workspaceId)).map(toMaterialDto)) });

/** GET /api/app/calendar/materials — what is waiting in her drop box. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  return list(ws.id);
});

/** POST — multipart: files[], kind, labels[]. Each photo becomes one planned post. */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`materials:${session.userId}`, 200, 86400);
  const ws = await requireWorkspace(session.userId, 'brand');
  const form = await readForm(req);
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0 || files.length > MAX_MATERIALS_PER_UPLOAD) {
    throw new HttpError(400, 'invalid_files', `Add 1 to ${MAX_MATERIALS_PER_UPLOAD} photos.`);
  }
  const kindValue = form.get('kind');
  const kind = isMaterialKind(kindValue) ? kindValue : 'listing';
  const labels = form.getAll('labels').map(String);

  for (const [i, file] of files.entries()) {
    const image = await normalizeUpload(file, `photo ${i + 1}`);
    await addMaterial(ws, image, { kind, label: labels[i]?.trim() || null });
  }
  return list(ws.id);
});
