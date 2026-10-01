/**
 * GET /api/admin/auto-slideshow/workspaces — workspaces with a TikTok account connected (the run's posting target).
 * A signed-in user passes ?runId= and gets only that run's workspace (when its TikTok account is connected).
 */
import { json } from '../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../src/server/autoSlideshow/access';
import { listTikTokWorkspaces } from '../../../../../src/server/autoSlideshow/posting';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { tiktok } from '../../../../../src/server/social/tiktok';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) => {
  const configured = tiktok.configured();
  if (access.admin) return json({ workspaces: await listTikTokWorkspaces(), tiktokConfigured: configured });
  const runId = new URL(req.url).searchParams.get('runId');
  const runWorkspace = runId ? await assertRunAccess(access, runId) : null;
  return json({ workspaces: runWorkspace ? await listTikTokWorkspaces(runWorkspace) : [], tiktokConfigured: configured });
});
