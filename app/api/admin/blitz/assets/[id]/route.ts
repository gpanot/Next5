import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { BLITZ_UPLOAD_PREFIX, toAssetDto } from '../../../../../../src/server/admin/blitzStore';
import { deleteFromR2 } from '../../../../../../src/lib/r2';
import { prisma } from '../../../../../../src/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** Loads an uploaded asset. Curated library assets are read-only and return 403. */
const findUpload = async (id: string) => {
  const asset = await prisma.blitzAsset.findUnique({ where: { id } });
  if (!asset) return { error: NextResponse.json({ error: 'Asset not found' }, { status: 404 }) };
  if (!asset.r2Key.startsWith(BLITZ_UPLOAD_PREFIX)) {
    return { error: NextResponse.json({ error: 'Library assets cannot be changed' }, { status: 403 }) };
  }
  return { asset };
};

/** PATCH /api/admin/blitz/assets/[id]  Body: { name } — rename an uploaded asset. */
export const PATCH = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const found = await findUpload(id);
  if (found.error) return found.error;
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const asset = await prisma.blitzAsset.update({ where: { id }, data: { name } });
  return NextResponse.json({ asset: await toAssetDto(asset) });
});

/**
 * DELETE /api/admin/blitz/assets/[id] — delete an uploaded asset and its R2 file.
 * Finished renders are separate files, so they keep working.
 */
export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const found = await findUpload(id);
  if (found.error) return found.error;

  // Do not pull the file out from under a render that is still queued or running.
  const active = await prisma.blitzProject.findMany({
    where: { renderStatus: { in: ['PENDING', 'PROCESSING'] } },
    select: { currentAssets: true },
  });
  if (active.some((p) => Object.values(p.currentAssets as Record<string, unknown>).includes(found.asset.r2Key))) {
    return NextResponse.json({ error: 'This file is used by a render in progress. Try again when it finishes.' }, { status: 409 });
  }

  await prisma.blitzAsset.delete({ where: { id } });
  await deleteFromR2(found.asset.r2Key).catch((err) => console.warn('[blitz] R2 delete failed:', err));
  return NextResponse.json({ ok: true });
});
