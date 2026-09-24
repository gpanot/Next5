import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../src/server/admin/route';
import { toAssetDto, blitzMediaKind } from '../../../../src/server/admin/blitzStore';
import { toVideoDto } from '../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../src/lib/db';

/**
 * GET /api/admin/assets-library
 *
 * Returns all four asset buckets for the Assets Library admin tab:
 *   memes       — BlitzAsset type=OVERLAY (video clips used as meme overlays)
 *   videos      — BlitzAsset type=BACKGROUND where the file is a video (scraped, not AI)
 *   sounds      — BlitzAsset type=AUDIO
 *   aiPictures  — BlitzAsset type=BACKGROUND where the file is an image (jpg/png/webp)
 *   ugcVideos   — UgcVideo rows (status=ready, workspaceId=null = Next5-owned)
 *
 * Pagination: each section returns up to `limit` rows (default 60).
 * Pass ?section=memes|videos|sounds|aiPictures|ugcVideos&cursor=<createdAt ISO>&limit=N for pagination.
 */
export const GET = adminRoute(async (req) => {
  const { searchParams } = req.nextUrl;
  const section = searchParams.get('section') as string | null;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '120', 10), 300);
  const cursor = searchParams.get('cursor') ?? undefined;
  const q = searchParams.get('q')?.trim().toLowerCase() ?? '';

  const cursorDate = cursor ? new Date(cursor) : undefined;
  const nameFilter = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};

  if (section === 'memes' || !section) {
    const rows = await prisma.blitzAsset.findMany({
      where: { type: 'OVERLAY', ...nameFilter, ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: section ? limit : 120,
    });
    const assets = await Promise.all(rows.map(toAssetDto));
    if (section) return NextResponse.json({ assets, total: await prisma.blitzAsset.count({ where: { type: 'OVERLAY' } }) });

    // Full load (no section filter) — return all buckets
    const videoRows = await prisma.blitzAsset.findMany({
      where: { type: 'BACKGROUND' },
      orderBy: { createdAt: 'asc' },
      take: 600,
    });
    const allBg = await Promise.all(videoRows.map(toAssetDto));
    const videos = allBg.filter((a) => a.mediaKind === 'video');
    const aiPictures = allBg.filter((a) => a.mediaKind === 'image');

    const soundRows = await prisma.blitzAsset.findMany({
      where: { type: 'AUDIO' },
      orderBy: { name: 'asc' },
    });
    const sounds = await Promise.all(soundRows.map(toAssetDto));

    const ugcRows = await prisma.ugcVideo.findMany({
      where: { status: 'ready', workspaceId: null },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { character: true },
    });
    const ugcVideos = await Promise.all(ugcRows.map(toVideoDto));

    return NextResponse.json({
      memes: assets,
      videos,
      sounds,
      aiPictures,
      ugcVideos,
      counts: {
        memes: assets.length,
        videos: videos.length,
        sounds: sounds.length,
        aiPictures: aiPictures.length,
        ugcVideos: ugcVideos.length,
      },
    });
  }

  if (section === 'videos') {
    const rows = await prisma.blitzAsset.findMany({
      where: { type: 'BACKGROUND', ...nameFilter, ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    const all = await Promise.all(rows.map(toAssetDto));
    const assets = all.filter((a) => a.mediaKind === 'video');
    return NextResponse.json({ assets });
  }

  if (section === 'sounds') {
    const rows = await prisma.blitzAsset.findMany({
      where: { type: 'AUDIO', ...nameFilter },
      orderBy: { name: 'asc' },
      take: limit,
    });
    const assets = await Promise.all(rows.map(toAssetDto));
    return NextResponse.json({ assets });
  }

  if (section === 'aiPictures') {
    const rows = await prisma.blitzAsset.findMany({
      where: { type: 'BACKGROUND', ...nameFilter, ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const all = await Promise.all(rows.map(toAssetDto));
    const assets = all.filter((a) => a.mediaKind === 'image');
    return NextResponse.json({ assets });
  }

  if (section === 'ugcVideos') {
    const rows = await prisma.ugcVideo.findMany({
      where: { status: 'ready', workspaceId: null, ...(q ? { script: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { character: true },
    });
    const ugcVideos = await Promise.all(rows.map(toVideoDto));
    return NextResponse.json({ ugcVideos });
  }

  return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
});
