import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { listListingVideos, parsePresets, startListingVideos } from '../../../../../../src/server/realtorVideo/jobs';
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

/** POST { presets?: ('editorial' | 'rate')[] } — make the picked videos (both by default); a preset already in progress is skipped. */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const body = (await req.json().catch(() => ({}))) as { presets?: unknown };
  await startListingVideos(ws, listingId, parsePresets(body.presets));
  return NextResponse.json({ videos: await listListingVideos(ws, listingId) });
});
