import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { readJsonObject } from '../../../../../../src/server/http';
import { getListing, toListingDto } from '../../../../../../src/server/listings/listings';
import { addZillowPhotos } from '../../../../../../src/server/listings/zillowImport';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

// Downloads the photos she picked.
export const maxDuration = 60;

type Ctx = { params: Promise<{ listingId: string }> };

/** POST { photoIds } — add gallery photos back from Zillow (ones she removed, or new ones a refresh found). */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const body = await readJsonObject(req);
  await addZillowPhotos(ws, listingId, Array.isArray(body.photoIds) ? body.photoIds.map(String) : []);
  return NextResponse.json({ listing: await toListingDto(await getListing(ws.id, listingId)) });
});
