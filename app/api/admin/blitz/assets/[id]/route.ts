import { after, NextResponse, type NextRequest } from 'next/server';
import { labRoute, type LabAccess } from '../../../../../../src/server/labs/labAccess';
import { isBlitzUploadKey, toAssetDto } from '../../../../../../src/server/admin/blitzStore';
import { deleteFromR2 } from '../../../../../../src/lib/r2';
import { prisma } from '../../../../../../src/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** Loads an uploaded asset. Curated library assets are read-only and return 403; users only reach their workspace's. */
const findUpload = async (id: string, access: LabAccess) => {
  const asset = await prisma.blitzAsset.findUnique({ where: { id } });
  if (!asset || (!access.admin && asset.workspaceId !== access.workspaceId)) return { error: NextResponse.json({ error: 'Asset not found' }, { status: 404 }) };
  if (!isBlitzUploadKey(asset.r2Key)) {
    return { error: NextResponse.json({ error: 'Library assets cannot be changed' }, { status: 403 }) };
  }
  return { asset };
};

/** PATCH /api/admin/blitz/assets/[id]  Body: { name } — rename an uploaded asset. */
export const PATCH = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const found = await findUpload(id, access);
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
export const DELETE = labRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const found = await findUpload(id, access);
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
  // The row is gone, so the file is unreachable; remove it after responding.
  const key = found.asset.r2Key;
  after(() => deleteFromR2(key).catch((err) => console.warn('[blitz] R2 delete failed:', err)));
  return NextResponse.json({ ok: true });
});
