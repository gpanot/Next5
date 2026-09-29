/** GET /api/admin/auto-slideshow/workspaces — workspaces with a TikTok account connected (the run's posting target) */
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { listTikTokWorkspaces } from '../../../../../src/server/autoSlideshow/posting';
import { tiktok } from '../../../../../src/server/social/tiktok';

export const GET = adminRoute(async () => json({ workspaces: await listTikTokWorkspaces(), tiktokConfigured: tiktok.configured() }));
