import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';

/**
 * GET /api/admin/assets-library/descriptor?blitzAssetId=<id>
 * GET /api/admin/assets-library/descriptor?ugcVideoId=<id>
 *
 * Returns the AssetDescriptor for a single asset, if one exists.
 * Used by the "See Description" expand panel in the Assets Library tab.
 */
export const GET = adminRoute(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const blitzAssetId = searchParams.get('blitzAssetId');
  const ugcVideoId   = searchParams.get('ugcVideoId');

  if (!blitzAssetId && !ugcVideoId) {
    return NextResponse.json({ error: 'Provide blitzAssetId or ugcVideoId' }, { status: 400 });
  }

  const descriptor = await prisma.assetDescriptor.findFirst({
    where: blitzAssetId ? { blitzAssetId } : { ugcVideoId: ugcVideoId! },
  });

  return NextResponse.json({ descriptor });
});
