import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';

/**
 * GET /api/admin/blitz/listing-runs
 * Returns the 20 most recent Zillow listing runs (for the "Recent listings" sidebar).
 */
export const GET = adminRoute(async () => {
  const runs = await prisma.blitzListingRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      zillowUrl: true,
      zpid: true,
      address: true,
      facts: true,
      candidates: true,
      angles: true,
      selectedIds: true,
      photoTags: true,
      scrapeDurationMs: true,
      avgPhotoFetchMs: true,
      apifyCostUsdMicros: true,
      createdAt: true,
    },
  });

  // Serialize BigInt fields before JSON serialisation
  return NextResponse.json({
    runs: runs.map((r) => ({
      ...r,
      apifyCostUsdMicros: r.apifyCostUsdMicros !== null ? Number(r.apifyCostUsdMicros) : null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});
