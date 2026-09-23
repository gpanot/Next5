import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { browserUrl, putFile, uniqueStamp, vendorUrl } from '../../../../../../src/server/admin/ugcStore';
import { cloneKeys, trimVideo, extractFirstFrame } from '../../../../../../src/server/admin/cloneUtils';

// Videos can be up to 200 MB — give the upload route 5 minutes to receive, trim, and store
export const maxDuration = 300;

const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg',  'jpg'],
  ['image/png',  'png'],
  ['image/webp', 'webp'],
]);

const AUDIO_TYPES = new Map([
  ['audio/mpeg',  'mp3'],
  ['audio/mp3',   'mp3'],
  ['audio/wav',   'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/wave',  'wav'],
  ['audio/mp4',   'm4a'],
  ['audio/m4a',   'm4a'],
  ['audio/x-m4a', 'm4a'],
  ['audio/aac',   'aac'],
]);

const VIDEO_TYPES = new Map([
  ['video/mp4',       'mp4'],
  ['video/quicktime', 'mov'],
]);

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;  // 12 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;  // 10 MB

/**
 * POST multipart: file + purpose ("character" | "video" | "voice")
 *
 * character → JPEG/PNG/WebP image stored in R2; returns { key, vendorUrl } (7-day vendor link)
 * video     → MP4/MOV stored in R2; returns { key, vendorUrl, trimmed, frameKey, frameVendorUrl }
 * voice     → MP3/WAV/M4A/AAC stored in R2; returns { key, voiceUrl, voiceVendorUrl }
 */
export const POST = adminRoute(async (req: NextRequest) => {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const purpose = formData.get('purpose') as string | null;
  const stamp = uniqueStamp();

  if (purpose === 'character') {
    const ext = IMAGE_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images accepted' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is larger than 12 MB' }, { status: 413 });
    }
    const key = cloneKeys.character(stamp, ext);
    await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
    const url = await vendorUrl(key);
    return NextResponse.json({ key, vendorUrl: url });
  }

  if (purpose === 'video') {
    const ext = VIDEO_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Only MP4 or MOV videos accepted' }, { status: 400 });
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video is larger than 200 MB' }, { status: 413 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let videoBuffer: Buffer = Buffer.from(await file.arrayBuffer() as any);

    const maxDurationRaw = formData.get('maxDuration');
    const maxDurationSec = maxDurationRaw ? Number(maxDurationRaw) : null;
    let trimmed = false;
    if (maxDurationSec && maxDurationSec > 0) {
      const trimmedBuffer = await trimVideo(videoBuffer, maxDurationSec);
      if (trimmedBuffer === null) {
        return NextResponse.json({
          error: `Could not trim the video to ${maxDurationSec} s. Please upload a clip that is already shorter.`,
        }, { status: 422 });
      }
      videoBuffer = trimmedBuffer;
      trimmed = true;
    }

    const storeExt = trimmed ? 'mp4' : ext;
    const storeType = trimmed ? 'video/mp4' : file.type;
    const key = cloneKeys.video(stamp, storeExt);
    await putFile(key, videoBuffer, storeType);
    const url = await vendorUrl(key);

    let frameKey: string | undefined;
    let frameVendorUrl: string | undefined;
    const frameBuffer = await extractFirstFrame(videoBuffer);
    if (frameBuffer) {
      frameKey = cloneKeys.frame(stamp);
      await putFile(frameKey, frameBuffer, 'image/jpeg');
      frameVendorUrl = await vendorUrl(frameKey);
    }

    return NextResponse.json({ key, vendorUrl: url, trimmed, frameKey, frameVendorUrl });
  }

  if (purpose === 'voice') {
    const ext = AUDIO_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Only MP3, WAV, M4A, or AAC audio accepted' }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file is larger than 10 MB' }, { status: 413 });
    }
    const key = cloneKeys.voice(stamp, ext);
    await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
    const [voiceUrl, voiceVendorUrl] = await Promise.all([
      browserUrl(key),
      vendorUrl(key),
    ]);
    return NextResponse.json({ key, voiceUrl, voiceVendorUrl });
  }

  return NextResponse.json({ error: 'purpose must be "character", "video", or "voice"' }, { status: 400 });
});
