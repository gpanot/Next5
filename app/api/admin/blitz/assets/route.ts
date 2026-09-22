import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { BLITZ_UPLOAD_PREFIX, BLITZ_UPLOAD_TYPES, toAssetDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';

/**
 * GET /api/admin/blitz/assets?type=BACKGROUND|OVERLAY|AUDIO
 * Returns the asset library (seeded + uploaded) filtered by type.
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

type RegisterBody = { type?: string; r2Key?: string; name?: string };

/**
 * POST /api/admin/blitz/assets
 * Body: { type, r2Key, name }
 * Registers a file the browser already uploaded to R2, so it shows up in the
 * library next time. Only keys under blitz/uploads/ are accepted.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as RegisterBody;
  const type = body.type?.toUpperCase();
  if (!type || !BLITZ_UPLOAD_TYPES.has(type)) {
    return NextResponse.json({ error: 'type must be BACKGROUND or OVERLAY' }, { status: 400 });
  }
  if (!body.r2Key?.startsWith(BLITZ_UPLOAD_PREFIX) || body.r2Key.includes('..')) {
    return NextResponse.json({ error: 'Invalid r2Key' }, { status: 400 });
  }
  const name = (body.name?.trim() || 'Upload').slice(0, 120);

  const asset = await prisma.blitzAsset.create({ data: { type, r2Key: body.r2Key, name } });
  return NextResponse.json({ asset: await toAssetDto(asset) }, { status: 201 });
});
