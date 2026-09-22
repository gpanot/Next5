import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { uploadToR2 } from '../../../../../src/lib/r2';
import {
  BLITZ_UPLOAD_TYPES,
  blitzAcceptsFile,
  blitzKeys,
  blitzUploadFormat,
  type BlitzUploadType,
} from '../../../../../src/server/admin/blitzStore';

/**
 * POST /api/admin/blitz/upload — FALLBACK path only.
 *
 * The browser normally uploads straight to R2 via /upload-url. It falls back to
 * this route when the direct PUT fails (for example, no CORS rule on the bucket).
 * This path is slow (file goes browser → server → R2) and on Vercel it fails
 * above ~4.5 MB.
 *
 * Multipart form: file, type ("BACKGROUND" | "OVERLAY" | "AUDIO"). Returns { r2Key }.
 * The caller registers the asset with POST /api/admin/blitz/assets.
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
  if (!type || !BLITZ_UPLOAD_TYPES.has(type)) {
    return NextResponse.json({ error: 'type must be BACKGROUND, OVERLAY or AUDIO' }, { status: 400 });
  }
  const format = blitzUploadFormat(file.name);
  if (!format || !blitzAcceptsFile(type as BlitzUploadType, file.name)) {
    return NextResponse.json({ error: 'Unsupported file type for this layer' }, { status: 400 });
  }

  const r2Key = blitzKeys.upload(type as BlitzUploadType, format.ext);
  const uploadedKey = await uploadToR2(r2Key, Buffer.from(await file.arrayBuffer()), format.contentType);
  if (!uploadedKey) {
    return NextResponse.json({ error: 'R2 not configured — uploads unavailable' }, { status: 503 });
  }
  return NextResponse.json({ r2Key: uploadedKey });
});
