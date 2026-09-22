import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { uploadToR2, getPresignedUrl } from '../../../../../src/lib/r2';

const ALLOWED_TYPES = new Set(['BACKGROUND', 'OVERLAY']);

const CONTENT_TYPE_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * POST /api/admin/blitz/upload
 *
 * Accepts a multipart form with:
 *   file — the media file (video or image)
 *   type — "BACKGROUND" or "OVERLAY"
 *
 * Uploads straight to R2 under blitz/uploads/{type}/{timestamp}-{random}.{ext}
 * and returns { r2Key, url } where url is a 24-hour presigned GET URL.
 *
 * No BlitzAsset DB record is created — the upload is session-scoped.
 * The caller should add the returned DTO to its local asset list so the
 * preview player can resolve the URL via its findUrl() helper.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Multipart body expected' }, { status: 400 });
  }

  const file = form.get('file');
  const type = (form.get('type') as string | null)?.toUpperCase();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!type || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: 'type must be BACKGROUND or OVERLAY' }, { status: 400 });
  }

  const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'bin';
  const contentType = CONTENT_TYPE_MAP[ext] ?? file.type ?? 'application/octet-stream';
  const r2Key = `blitz/uploads/${type.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadedKey = await uploadToR2(r2Key, buffer, contentType);

  if (!uploadedKey) {
    return NextResponse.json({ error: 'R2 not configured — uploads unavailable' }, { status: 503 });
  }

  // 24-hour presigned URL for preview in the browser
  const url = await getPresignedUrl(uploadedKey, 3600 * 24);

  return NextResponse.json({ r2Key: uploadedKey, url, name: file.name });
});
