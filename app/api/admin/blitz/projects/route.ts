import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toProjectDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';

/**
 * GET /api/admin/blitz/projects — list COMPLETED projects for the library grid.
 */
export const GET = adminRoute(async () => {
  const projects = await prisma.blitzProject.findMany({
    where: { renderStatus: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const dtos = await Promise.all(projects.map(toProjectDto));
  return NextResponse.json({ projects: dtos });
});
