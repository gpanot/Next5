import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';
import { browserUrl, putFile, uniqueStamp, vendorUrl } from '../../../../../../src/server/admin/ugcStore';
import { cloneKeys, trimVideo, extractFirstFrame } from '../../../../../../src/server/admin/cloneUtils';

// Download + trim can take a while on a slow CDN — cap at 3 minutes
export const maxDuration = 180;

// ── Treg response shape ────────────────────────────────────────────────────────

type VideoDownloadResult = {
  output?: {
    found?: boolean;
    data?: {
      durationSeconds?: number;
      id?: string;
      image?: string;
      videoUrl?: string;
      watermarkedUrl?: string;
    };
  };
};

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST { videoUrl: string, maxDuration?: number }
 *
 * Downloads a TikTok video via Treg (no-watermark CDN URL), trims it,
 * uploads the trimmed clip + first frame to R2, and returns R2 keys and
 * short-lived vendor URLs ready to be set as the Clone tab reference video.
 *
 * Cost: $0.0012 / call (anyapi.tiktok.video_download — per success, verified 2026-09-19)
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { videoUrl?: string; maxDuration?: number };

  const videoPageUrl = body.videoUrl?.trim();
  if (!videoPageUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
  }

  const maxDurationSec = typeof body.maxDuration === 'number' && body.maxDuration > 0
    ? body.maxDuration
    : 60;

  // ── Step 1: Resolve CDN play URL via Treg ─────────────────────────────────
  let cdnVideoUrl: string;
  let durationSeconds: number | undefined;
  let coverImageUrl: string | undefined;
  try {
    const result = await tregCall<VideoDownloadResult>('anyapi.tiktok.video_download', {
      method: 'POST',
      body: { url: videoPageUrl },
      timeoutMs: 30_000,
    });

    const data = result.output?.data;
    if (!result.output?.found || !data?.videoUrl) {
      return NextResponse.json(
        { error: 'Could not retrieve a download URL for this TikTok video. The video may be private or unavailable.' },
        { status: 422 },
      );
    }

    cdnVideoUrl    = data.videoUrl;
    durationSeconds = data.durationSeconds;
    coverImageUrl  = data.image;
  } catch (err) {
    console.error('[source-from-url] Treg video_download failed:', err);
    return NextResponse.json(
      { error: 'Failed to resolve video download URL. Please try again.' },
      { status: 502 },
    );
  }

  // ── Step 2: Download the CDN MP4 ─────────────────────────────────────────
  let videoBuffer: Buffer;
  try {
    const cdnRes = await fetch(cdnVideoUrl, {
      signal: AbortSignal.timeout(90_000),
      headers: {
        // Mimic a browser request so the CDN doesn't reject it
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
      },
    });
    if (!cdnRes.ok) {
      throw new Error(`CDN returned HTTP ${cdnRes.status}`);
    }
    videoBuffer = Buffer.from(await cdnRes.arrayBuffer());
  } catch (err) {
    console.error('[source-from-url] CDN download failed:', err);
    return NextResponse.json(
      { error: 'Failed to download the video file. The CDN link may have expired — please retry.' },
      { status: 502 },
    );
  }

  // ── Step 3: Trim to maxDuration ───────────────────────────────────────────
  let trimmed = false;
  const shouldTrim = typeof durationSeconds === 'number'
    ? durationSeconds > maxDurationSec
    : true; // trim defensively when duration is unknown

  if (shouldTrim) {
    const trimmedBuffer = await trimVideo(videoBuffer, maxDurationSec);
    if (trimmedBuffer === null) {
      return NextResponse.json(
        { error: `Could not trim the video to ${maxDurationSec} s. Please try a shorter clip.` },
        { status: 422 },
      );
    }
    videoBuffer = trimmedBuffer;
    trimmed = true;
  }

  // ── Step 4: Upload to R2 ──────────────────────────────────────────────────
  const stamp = uniqueStamp();
  const videoKey = cloneKeys.video(stamp, 'mp4');
  await putFile(videoKey, videoBuffer, 'video/mp4');
  const videoVendorUrl = await vendorUrl(videoKey);
  const videoBrowserUrl = await browserUrl(videoKey);

  // ── Step 5: First frame ───────────────────────────────────────────────────
  let frameKey: string | undefined;
  let frameVendorUrl: string | undefined;

  const frameBuffer = await extractFirstFrame(videoBuffer);
  if (frameBuffer) {
    frameKey = cloneKeys.frame(stamp);
    await putFile(frameKey, frameBuffer, 'image/jpeg');
    frameVendorUrl = await vendorUrl(frameKey);
  } else if (coverImageUrl) {
    // Fallback: use the TikTok cover thumbnail as first frame
    try {
      const coverRes = await fetch(coverImageUrl, { signal: AbortSignal.timeout(10_000) });
      if (coverRes.ok) {
        const coverBuffer = Buffer.from(await coverRes.arrayBuffer());
        frameKey = cloneKeys.frame(stamp);
        await putFile(frameKey, coverBuffer, 'image/jpeg');
        frameVendorUrl = await vendorUrl(frameKey);
      }
    } catch {
      // Non-fatal — first frame is optional
    }
  }

  return NextResponse.json({
    key: videoKey,
    vendorUrl: videoVendorUrl,
    browserUrl: videoBrowserUrl,
    trimmed,
    durationSeconds,
    frameKey,
    frameVendorUrl,
  });
});
