import { NextResponse } from 'next/server';
import { labRoute, ownedBy } from '../../../../../src/server/labs/labAccess';
import { toProjectDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';
import { refundFailedRenders } from '../../../../../src/server/slideshowCredits/blitzCharge';

/**
 * GET /api/admin/blitz/projects — list COMPLETED projects for the library grid. Users see their workspace's only.
 */
export const GET = labRoute(async (_req, _ctx: unknown, access) => {
  // Renders that failed while nobody was polling them get their credit back here (once each).
  if (!access.admin) await refundFailedRenders(access.workspaceId);

  const projects = await prisma.blitzProject.findMany({
    where: { renderStatus: 'COMPLETED', ...ownedBy(access) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const dtos = await Promise.all(projects.map(toProjectDto));
  return NextResponse.json({ projects: dtos });
});
