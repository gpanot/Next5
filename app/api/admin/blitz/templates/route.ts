import { NextResponse } from 'next/server';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { toTemplateDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';

/** GET /api/admin/blitz/templates — list all Blitz Lab templates */
export const GET = labRoute(async () => {
  const templates = await prisma.blitzTemplate.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ templates: templates.map(toTemplateDto) });
});
