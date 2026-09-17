import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../src/server/api';
import { HttpError } from '../../../../../../../src/server/http';
import { getListing, removeRoom, replaceRoom, toListingDto } from '../../../../../../../src/server/listings/listings';
import { enforceRateLimit } from '../../../../../../../src/server/rateLimit';
import { normalizeUpload, readForm } from '../../../../../../../src/server/storage/images';
import { requireWorkspace } from '../../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ listingId: string; materialId: string }> };

/** PUT — multipart: file. "Replace with your original": her file takes the place of an imported photo. */
export const PUT = authedRoute(async (req, session, { params }: Ctx) => {
  await enforceRateLimit(`rooms:${session.userId}`, 200, 86400);
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId, materialId } = await params;
  const file = (await readForm(req)).get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'invalid_files', 'Add a photo.');
  const original = await sharp(Buffer.from(await file.arrayBuffer())).metadata().catch(() => null);
  await replaceRoom(ws.id, listingId, materialId, await normalizeUpload(file, 'photo'), { width: original?.width ?? null, height: original?.height ?? null });
  return NextResponse.json({ listing: await toListingDto(await getListing(ws.id, listingId)) });
});

export const DELETE = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId, materialId } = await params;
  await removeRoom(ws.id, materialId);
  return NextResponse.json({ listing: await toListingDto(await getListing(ws.id, listingId)) });
});
