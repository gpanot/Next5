/**
 * POST   /api/admin/auto-slideshow/tiktok-accounts/[workspaceId] — { url }: TikTok sign-in for this workspace (returns to the admin)
 * DELETE /api/admin/auto-slideshow/tiktok-accounts/[workspaceId] — disconnect its TikTok account
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { adminConnectUrl, adminDisconnect } from '../../../../../../src/server/autoSlideshow/tiktokAccounts';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  return json({ url: await adminConnectUrl(workspaceId) });
});

export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  await adminDisconnect(workspaceId);
  return json({ ok: true });
});
