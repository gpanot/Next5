import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { listListingVideos, startListingVideos } from '../../../../../../src/server/realtorVideo/jobs';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

// The prep (photo tags, script, two voiceovers with read-back checks) runs in after() and takes about 1–2 min.
export const maxDuration = 300;

type Ctx = { params: Promise<{ listingId: string }> };

/** GET — the latest Editorial and "Rate this house" videos of this listing, with their status. */
export const GET = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  return NextResponse.json({ videos: await listListingVideos(ws, listingId) });
});

/** POST — make both videos for this listing (no-op while a pair is already being made). */
export const POST = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  await startListingVideos(ws, listingId);
  return NextResponse.json({ videos: await listListingVideos(ws, listingId) });
});
