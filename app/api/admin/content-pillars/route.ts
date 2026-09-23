import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { adminRoute } from '../../../../src/server/admin/route';

/** GET /api/admin/content-pillars — the 6 pillars, for the template editor's pickers. */
export const GET = adminRoute(async () => {
  const pillars = await prisma.contentPillar.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, slug: true, name: true, description: true },
  });
  return NextResponse.json({ pillars });
});
