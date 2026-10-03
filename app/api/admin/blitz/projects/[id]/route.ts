import { NextResponse, type NextRequest } from 'next/server';
import { assertOwned, labRoute } from '../../../../../../src/server/labs/labAccess';
import { toProjectDto } from '../../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../../src/lib/db';
import { deleteFromR2 } from '../../../../../../src/lib/r2';
import { refundFailedRender } from '../../../../../../src/server/slideshowCredits/blitzCharge';

/**
 * GET /api/admin/blitz/projects/[id]
 * Polling endpoint — returns the current renderStatus + signed renderedVideoUrl.
 * While PENDING it also returns queuePosition: 1 = next to render. The worker renders oldest first.
 */
export const GET = labRoute(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }, access) => {
  const { id } = await ctx.params;

  const project = await prisma.blitzProject.findUnique({ where: { id } });
  if (!project) {
    console.warn(`[blitz/projects/${id}] Not found`);
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  assertOwned(access, project.workspaceId, 'Project');
  // A workspace render that failed gives its credit back (once).
  if (project.renderStatus === 'FAILED' && project.workspaceId) await refundFailedRender(project.id);

  // Log status changes (only when PENDING/PROCESSING to avoid noise for completed)
  if (project.renderStatus !== 'COMPLETED') {
    console.log(`[blitz/projects/${id}] Poll — status=${project.renderStatus}`);
  }

  const queuePosition = project.renderStatus === 'PENDING'
    ? (await prisma.blitzProject.count({ where: { renderStatus: 'PENDING', createdAt: { lt: project.createdAt } } })) + 1
    : null;

  return NextResponse.json({ project: await toProjectDto(project), queuePosition });
});

/**
 * DELETE /api/admin/blitz/projects/[id]
 * Deletes the DB row and the rendered R2 video.
 */
export const DELETE = labRoute(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }, access) => {
  const { id } = await ctx.params;

  const project = await prisma.blitzProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  assertOwned(access, project.workspaceId, 'Project');

  // Delete R2 object if present
  if (project.renderedVideoKey) {
    await deleteFromR2(project.renderedVideoKey).catch((err) =>
      console.warn(`[blitz/projects/${id}] R2 delete failed (ignored):`, err),
    );
  }

  await prisma.blitzProject.delete({ where: { id } });
  console.log(`[blitz/projects/${id}] Deleted`);
  return NextResponse.json({ ok: true });
});
