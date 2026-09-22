import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toAssetDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';

/**
 * GET /api/admin/blitz/assets?type=BACKGROUND|OVERLAY|AUDIO
 * Returns the flat, manually-seeded asset registry filtered by type.
 */
export const GET = adminRoute(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get('type') ?? undefined;

  const assets = await prisma.blitzAsset.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: 'asc' },
  });

  const dtos = await Promise.all(assets.map(toAssetDto));
  return NextResponse.json({ assets: dtos });
});
