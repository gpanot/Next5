import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';
import type { Prisma } from '@prisma/client';

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

/**
 * PATCH /api/admin/assets-library/descriptor
 * Body: { id, hasSpeech?, transcript? }
 *
 * Manual fix for speech fields the extractor got wrong (e.g. a meme with speech
 * flagged hasSpeech=false). Updates both the descriptor JSON and the hasSpeech column.
 */
export const PATCH = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => null)) as
    | { id?: unknown; hasSpeech?: unknown; transcript?: unknown }
    | null;
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  if (body.hasSpeech !== undefined && typeof body.hasSpeech !== 'boolean') {
    return NextResponse.json({ error: 'hasSpeech must be boolean' }, { status: 400 });
  }
  if (body.transcript !== undefined && body.transcript !== null && typeof body.transcript !== 'string') {
    return NextResponse.json({ error: 'transcript must be string or null' }, { status: 400 });
  }

  const row = await prisma.assetDescriptor.findUnique({ where: { id: body.id } });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const current = (row.descriptor ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...current };
  if (typeof body.hasSpeech === 'boolean') next.hasSpeech = body.hasSpeech;
  if (body.transcript !== undefined) {
    const t = typeof body.transcript === 'string' ? body.transcript.trim() : '';
    next.transcript = t.length > 0 ? t : null;
  }

  const descriptor = await prisma.assetDescriptor.update({
    where: { id: body.id },
    data: {
      descriptor: next as Prisma.InputJsonValue,
      ...(typeof body.hasSpeech === 'boolean' ? { hasSpeech: body.hasSpeech } : {}),
      updatedAt: new Date(),
    },
  });
  return NextResponse.json({ descriptor });
});
