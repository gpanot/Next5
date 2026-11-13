import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { listAddableVideos } from '../../../../../src/server/calendar/calendar';
import { getPresignedUrl } from '../../../../../src/lib/r2';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const SIGN_SECONDS = 3600;

/** GET /api/app/calendar/videos — listing videos she can still add to a day, newest first. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const rows = await listAddableVideos(ws.id);
  const videos = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      preset: r.preset,
      listingLabel: r.listing.label,
      ready: r.status === 'ready',
      url: r.status === 'ready' && r.videoKey ? await getPresignedUrl(r.videoKey, SIGN_SECONDS) : null,
    })),
  );
  return NextResponse.json({ videos });
});
