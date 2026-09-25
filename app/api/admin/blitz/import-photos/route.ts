import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { HttpError } from '../../../../../src/server/http';
import { uploadToR2 } from '../../../../../src/lib/r2';
import { prisma } from '../../../../../src/lib/db';
import { blitzKeys, toAssetDto } from '../../../../../src/server/admin/blitzStore';

type Body = { photoUrls?: string[]; listingRunId?: string };

const MAX_PHOTOS = 10;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per photo

/**
 * POST /api/admin/blitz/import-photos
 * Body: { photoUrls: string[] }  (Zillow CDN URLs)
 *
 * Downloads each photo server-side (no browser CORS issue), uploads to R2,
 * registers as a BACKGROUND BlitzAsset, and returns the asset DTOs.
 * Used by the Real Estate flow to populate slide backgrounds.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;
  const photoUrls = (body.photoUrls ?? [])
    .filter((u): u is string => typeof u === 'string' && u.startsWith('https://'))
    .slice(0, MAX_PHOTOS);
  const { listingRunId } = body;

  if (photoUrls.length === 0) throw new HttpError(400, 'no_urls', 'Provide at least one photo URL.');

  const fetchStart = Date.now();

  const results = await Promise.allSettled(
    photoUrls.map(async (url, i) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength > MAX_BYTES) throw new Error('Photo too large');

      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const name = `listing-photo-${i + 1}.${ext}`;
      const r2Key = blitzKeys.upload('BACKGROUND', ext);

      const saved = await uploadToR2(r2Key, buffer, contentType);
      if (!saved) throw new Error('R2 upload failed');

      const asset = await prisma.blitzAsset.create({
        data: { name, type: 'BACKGROUND', r2Key: saved, source: 'upload' },
      });
      return toAssetDto(asset);
    }),
  );

  const assets = await Promise.all(
    results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof toAssetDto>>> => r.status === 'fulfilled')
      .map((r) => r.value),
  );

  // Record average photo-fetch time on the listing run (fire-and-forget) + return it to the caller
  const successCount = assets.length;
  const totalFetchMs = Date.now() - fetchStart;
  const avgPhotoFetchMs = successCount > 0 ? Math.round(totalFetchMs / successCount) : null;

  if (listingRunId && avgPhotoFetchMs !== null) {
    void prisma.blitzListingRun
      .update({ where: { id: listingRunId }, data: { avgPhotoFetchMs } })
      .catch(() => { /* non-critical — ignore */ });
  }

  return NextResponse.json({ assets, avgPhotoFetchMs, totalFetchMs });
});
