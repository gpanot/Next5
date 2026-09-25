import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../src/lib/db';

type Body = {
  selectedIds?: string[];
  photoTags?: string[];
  avgPhotoFetchMs?: number;
};

/**
 * PATCH /api/admin/blitz/listing-runs/:id
 * Updates the user's selection + photo-fetch stats after the user confirms photos.
 */
export const PATCH = adminRoute(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await req.json()) as Body;

  const data: Record<string, unknown> = {};
  if (body.selectedIds !== undefined) data.selectedIds = body.selectedIds;
  if (body.photoTags !== undefined) data.photoTags = body.photoTags;
  if (typeof body.avgPhotoFetchMs === 'number') data.avgPhotoFetchMs = body.avgPhotoFetchMs;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true }); // nothing to update
  }

  await prisma.blitzListingRun.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
});
