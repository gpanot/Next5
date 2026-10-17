import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../src/server/admin/route';
import { toAssetDto, blitzImageKeyWhere } from '../../../../src/server/admin/blitzStore';
import { toVideoDto } from '../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../src/lib/db';

/**
 * GET /api/admin/assets-library
 *
 * Returns all asset buckets for the Assets Library admin tab:
 *   memes       — BlitzAsset type=OVERLAY (video clips used as meme overlays)
 *   videos      — BlitzAsset type=BACKGROUND where the file is a video (scraped, not AI)
 *   sounds      — BlitzAsset type=AUDIO
 *   aiPictures  — BlitzAsset type=BACKGROUND where the file is an image (jpg/png/webp), newest first
 *   ugcVideos   — UgcVideo rows (status=ready, workspaceId=null = Next5-owned)
 *   hookVideos  — BlitzAsset type=HOOK (scraped hook library + manually added hooks)
 *
 * Images and videos share type=BACKGROUND, so they are split in the query (by file extension), never after `take`.
 *
 * Pagination: each section returns up to `limit` rows (default 120).
 * Pass ?section=memes|videos|sounds|aiPictures|ugcVideos|hookVideos&cursor=<createdAt ISO>&limit=N for pagination.
 */
/** Page size of the AI Pictures section (full load and each "Load more"). */
const AI_PICTURES_PAGE = 120;

/** Descriptor fields the library search matches on (tags live on the asset itself). */
const SEARCH_INCLUDE = { descriptor: { select: { retrievalText: true, mood: true } } } as const;

type SearchableAsset = Prisma.BlitzAssetGetPayload<{ include: typeof SEARCH_INCLUDE }>;

/** Asset DTO plus the descriptor text, so the search box finds "gym" or "friends" not only in names. */
const toSearchableDto = async (asset: SearchableAsset) => ({
  ...(await toAssetDto(asset)),
  searchText: [asset.descriptor?.retrievalText ?? '', ...(asset.descriptor?.mood ?? [])].join(' '),
});

const IMAGE_WHERE: Prisma.BlitzAssetWhereInput = { type: 'BACKGROUND', ...blitzImageKeyWhere };
const VIDEO_WHERE: Prisma.BlitzAssetWhereInput = { type: 'BACKGROUND', NOT: blitzImageKeyWhere };

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
      include: SEARCH_INCLUDE,
    });
    const assets = await Promise.all(rows.map(toSearchableDto));
    if (section) return NextResponse.json({ assets, total: await prisma.blitzAsset.count({ where: { type: 'OVERLAY' } }) });

    // Full load (no section filter) — return all buckets
    const videoRows = await prisma.blitzAsset.findMany({
      where: { AND: [VIDEO_WHERE] },
      orderBy: { createdAt: 'asc' },
      take: 600,
      include: SEARCH_INCLUDE,
    });
    const videos = await Promise.all(videoRows.map(toSearchableDto));
    const imageRows = await prisma.blitzAsset.findMany({
      where: { AND: [IMAGE_WHERE] },
      orderBy: { createdAt: 'desc' },
      take: AI_PICTURES_PAGE,
    });
    const aiPictures = await Promise.all(imageRows.map(toAssetDto));
    const [videoTotal, imageTotal] = await Promise.all([
      prisma.blitzAsset.count({ where: VIDEO_WHERE }),
      prisma.blitzAsset.count({ where: IMAGE_WHERE }),
    ]);

    const soundRows = await prisma.blitzAsset.findMany({
      where: { type: 'AUDIO' },
      orderBy: { name: 'asc' },
      include: SEARCH_INCLUDE,
    });
    const sounds = await Promise.all(soundRows.map(toSearchableDto));

    const ugcRows = await prisma.ugcVideo.findMany({
      where: { status: 'ready', workspaceId: null },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { character: true },
    });
    const ugcVideos = await Promise.all(ugcRows.map(toVideoDto));

    const hookRows = await prisma.blitzAsset.findMany({
      where: { type: 'HOOK' },
      orderBy: { createdAt: 'desc' },
      take: 600,
      include: SEARCH_INCLUDE,
    });
    const hookVideos = await Promise.all(hookRows.map(toSearchableDto));
    const hookTotal = await prisma.blitzAsset.count({ where: { type: 'HOOK' } });

    return NextResponse.json({
      memes: assets,
      videos,
      sounds,
      aiPictures,
      ugcVideos,
      hookVideos,
      counts: {
        memes: assets.length,
        videos: videoTotal,
        sounds: sounds.length,
        aiPictures: imageTotal,
        ugcVideos: ugcVideos.length,
        hookVideos: hookTotal,
      },
    });
  }

  if (section === 'videos') {
    const rows = await prisma.blitzAsset.findMany({
      where: { AND: [VIDEO_WHERE, nameFilter, cursorDate ? { createdAt: { gt: cursorDate } } : {}] },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: SEARCH_INCLUDE,
    });
    const assets = await Promise.all(rows.map(toSearchableDto));
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
      where: { AND: [IMAGE_WHERE, nameFilter, cursorDate ? { createdAt: { lt: cursorDate } } : {}] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const assets = await Promise.all(rows.map(toAssetDto));
    return NextResponse.json({ assets, total: await prisma.blitzAsset.count({ where: { AND: [IMAGE_WHERE, nameFilter] } }) });
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

  if (section === 'hookVideos') {
    const rows = await prisma.blitzAsset.findMany({
      where: { type: 'HOOK', ...nameFilter, ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const hookVideos = await Promise.all(rows.map(toAssetDto));
    return NextResponse.json({ hookVideos, total: await prisma.blitzAsset.count({ where: { type: 'HOOK' } }) });
  }

  return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
});
