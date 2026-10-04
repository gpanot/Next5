/**
 * GET   /api/slideshow/workspaces/[workspaceId]/content — the workspace's content settings: { slideshowPct }
 * PATCH /api/slideshow/workspaces/[workspaceId]/content — { slideshowPct: 0-100 }: share of slideshows in a batch of
 *       calendar ideas (the rest are Blitz videos). Applies to the next batch.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { requireSlideshowWorkspace } from '../../../../../../src/server/autoSlideshow/workspaces';
import { HttpError } from '../../../../../../src/server/http';
import { clampPct } from '../../../../../../src/types/admin/calendarIdeas';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  const ws = await requireSlideshowWorkspace(requireUser(access).userId, workspaceId);
  return NextResponse.json({ slideshowPct: ws.ideaSlideshowPct });
});

export const PATCH = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  await requireSlideshowWorkspace(requireUser(access).userId, workspaceId);
  const pct = clampPct(((await req.json().catch(() => ({}))) as { slideshowPct?: unknown }).slideshowPct);
  if (pct === null) throw new HttpError(400, 'invalid_pct', 'slideshowPct must be a number from 0 to 100.');
  const ws = await prisma.workspace.update({ where: { id: workspaceId }, data: { ideaSlideshowPct: pct } });
  return NextResponse.json({ slideshowPct: ws.ideaSlideshowPct });
});
