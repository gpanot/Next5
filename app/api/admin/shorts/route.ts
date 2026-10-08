/**
 * GET  /api/admin/shorts — recent shorts (newest first, 60)
 * POST /api/admin/shorts — { workspaceId, videoModel } → create a short and start its pipeline in the background
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../src/server/admin/route';
import { prisma } from '../../../../src/lib/db';
import { runShortPipeline } from '../../../../src/server/shorts/pipeline';
import { listShorts } from '../../../../src/server/shorts/store';
import { isShortVideoModel } from '../../../../src/types/admin/shorts';

// Script and voice run here; on Vercel photos, clips and render continue in their own invocations (see the pipeline hand-off).
export const maxDuration = 300;

export const GET = adminRoute(async () => json({ shorts: await listShorts() }));

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { workspaceId?: unknown; videoModel?: unknown };
  if (typeof body.workspaceId !== 'string' || !body.workspaceId) return json({ error: 'Pick a workspace' }, { status: 400 });
  if (!isShortVideoModel(body.videoModel)) return json({ error: 'Pick a video model: veo, seedance or omni' }, { status: 400 });
  const workspace = await prisma.workspace.findUnique({ where: { id: body.workspaceId }, select: { id: true } });
  if (!workspace) return json({ error: 'Workspace not found' }, { status: 404 });
  const short = await prisma.shortReel.create({ data: { workspaceId: workspace.id, videoModel: body.videoModel } });
  waitUntil(runShortPipeline(short.id, 1));
  return json({ id: short.id }, { status: 201 });
});
