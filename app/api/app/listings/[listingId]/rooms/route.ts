import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { MAX_ROOMS_PER_LISTING, addRoom, getListing, tagUntaggedRooms, toListingDto } from '../../../../../../src/server/listings/listings';
import { HttpError } from '../../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { normalizeUpload, readForm } from '../../../../../../src/server/storage/images';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ listingId: string }> };

/** POST — multipart: files[], labels[]. Each photo is one room we can place her into. */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  await enforceRateLimit(`rooms:${session.userId}`, 200, 86400);
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const form = await readForm(req);
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0 || files.length > MAX_ROOMS_PER_LISTING) {
    throw new HttpError(400, 'invalid_files', `Add 1 to ${MAX_ROOMS_PER_LISTING} photos.`);
  }
  const labels = form.getAll('labels').map(String);
  for (const [i, file] of files.entries()) {
    await addRoom(ws, listingId, await normalizeUpload(file, `photo ${i + 1}`), labels[i]?.trim() || null);
  }
  // Room tags pick the pose for each photo; tag in the background so the upload stays fast.
  after(() => tagUntaggedRooms(ws.id, listingId).catch((err: unknown) => console.error('[listings] tagging failed:', err)));
  return NextResponse.json({ listing: await toListingDto(await getListing(ws.id, listingId)) });
});
