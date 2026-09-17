import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../src/server/api';
import { toListingDto } from '../../../../../../src/server/listings/listings';
import { getImport, refreshZillowImport } from '../../../../../../src/server/listings/zillowImport';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

// Finishing a first import tags the gallery and downloads every photo.
export const maxDuration = 60;

type Ctx = { params: Promise<{ listingId: string }> };

/** GET — the property as it stands; finishes a completed run (poll fallback for the Apify webhook). */
export const GET = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const listing = await refreshZillowImport(await getImport(ws.id, (await params).listingId));
  const materials = await prisma.postMaterial.findMany({ where: { listingId: listing.id, archivedAt: null }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ listing: await toListingDto({ ...listing, materials }) });
});
