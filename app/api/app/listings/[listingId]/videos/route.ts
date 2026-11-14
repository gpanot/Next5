import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { allowedLength, listListingVideos, parsePresets, startListingVideos } from '../../../../../../src/server/realtorVideo/jobs';
import { workspaceHasPaid } from '../../../../../../src/server/slideshowCredits/paid';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

// The prep (photo tags, script, two voiceovers with read-back checks) runs in after() and takes about 1–2 min.
export const maxDuration = 300;

type Ctx = { params: Promise<{ listingId: string }> };

/** GET — the latest video of each template for this listing, with its status, and whether longer lengths are open. */
export const GET = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const [videos, paid] = await Promise.all([listListingVideos(ws, listingId), workspaceHasPaid(ws.id)]);
  return NextResponse.json({ videos, paid });
});

/**
 * POST { presets?: RealtorPreset[], length?: 'short' | 'standard' | 'auto' } — make the picked videos
 * (Editorial + Rate by default); a preset already in progress is skipped. Unpaid workspaces get 15 s only (402 otherwise).
 * Each new video costs 1 credit (402 insufficient_credits when the balance is short).
 */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const body = (await req.json().catch(() => ({}))) as { presets?: unknown; length?: unknown };
  await startListingVideos(ws, listingId, parsePresets(body.presets), await allowedLength(ws, body.length), { charge: true });
  return NextResponse.json({ videos: await listListingVideos(ws, listingId) });
});
