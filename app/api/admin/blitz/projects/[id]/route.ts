import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { toProjectDto } from '../../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../../src/lib/db';
import { deleteFromR2 } from '../../../../../../src/lib/r2';

/**
 * GET /api/admin/blitz/projects/[id]
 * Polling endpoint — returns the current renderStatus + signed renderedVideoUrl.
 */
export const GET = adminRoute(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;

  const project = await prisma.blitzProject.findUnique({ where: { id } });
  if (!project) {
    console.warn(`[blitz/projects/${id}] Not found`);
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Log status changes (only when PENDING/PROCESSING to avoid noise for completed)
  if (project.renderStatus !== 'COMPLETED') {
    console.log(`[blitz/projects/${id}] Poll — status=${project.renderStatus}`);
  }

  return NextResponse.json({ project: await toProjectDto(project) });
});

/**
 * DELETE /api/admin/blitz/projects/[id]
 * Deletes the DB row and the rendered R2 video.
 */
export const DELETE = adminRoute(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;

  const project = await prisma.blitzProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

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
