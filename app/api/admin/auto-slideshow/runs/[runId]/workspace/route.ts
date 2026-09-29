/** PUT /api/admin/auto-slideshow/runs/[runId]/workspace — { workspaceId | null }: the workspace whose TikTok account posts */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { setRunWorkspace } from '../../../../../../../src/server/autoSlideshow/posting';

type Ctx = { params: Promise<{ runId: string }> };

export const PUT = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { workspaceId?: unknown };
  await setRunWorkspace(runId, typeof body.workspaceId === 'string' && body.workspaceId ? body.workspaceId : null);
  return json({ ok: true });
});
