import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { adminRoute } from '../../../../../../src/server/admin/route';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/content-templates/[id]/versions — the version history.
 * Old versions are never deleted: a campaign generated against v1 must stay readable as v1.
 */
export const GET = adminRoute(async (_req, { params }: Ctx) => {
  const { id } = await params;
  const [template, versions] = await Promise.all([
    prisma.contentTemplate.findUnique({ where: { id }, select: { activeVersionId: true } }),
    prisma.contentTemplateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, hookPattern: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({
    versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString(), active: v.id === template?.activeVersionId })),
  });
});
