import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { toProjectDto } from '../../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../../src/lib/db';

/**
 * GET /api/admin/blitz/projects/[id]
 * Polling endpoint — returns the current renderStatus + signed renderedVideoUrl.
 */
export const GET = adminRoute(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;

  const project = await prisma.blitzProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json({ project: await toProjectDto(project) });
});
