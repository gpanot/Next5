/** GET /api/admin/auto-slideshow/tiktok-accounts?q= — workspaces (name or owner email) with their TikTok connection */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { listTikTokAccounts } from '../../../../../src/server/autoSlideshow/tiktokAccounts';
import { tiktok } from '../../../../../src/server/social/tiktok';

export const GET = adminRoute(async (req: NextRequest) =>
  json({ accounts: await listTikTokAccounts(new URL(req.url).searchParams.get('q') ?? ''), tiktokConfigured: tiktok.configured() }));
