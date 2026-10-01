/** PUT /api/admin/auto-slideshow/runs/[runId]/workspace — { workspaceId | null }: the workspace whose TikTok account posts */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { setRunWorkspace } from '../../../../../../../src/server/autoSlideshow/posting';

type Ctx = { params: Promise<{ runId: string }> };

export const PUT = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as { workspaceId?: unknown };
  // A signed-in user's run always posts with its own workspace: nothing to change.
  if (access.admin) await setRunWorkspace(runId, typeof body.workspaceId === 'string' && body.workspaceId ? body.workspaceId : null);
  return json({ ok: true });
});
