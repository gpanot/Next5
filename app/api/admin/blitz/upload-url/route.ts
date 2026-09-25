import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { getPresignedPutUrl } from '../../../../../src/lib/r2';
import {
  BLITZ_UPLOAD_TYPES,
  blitzAcceptsFile,
  blitzKeys,
  blitzUploadFormat,
  type BlitzUploadType,
} from '../../../../../src/server/admin/blitzStore';

type UploadUrlBody = { type?: string; fileName?: string };

/**
 * POST /api/admin/blitz/upload-url
 * Body: { type: "BACKGROUND" | "OVERLAY" | "AUDIO", fileName }
 * Returns: { r2Key, uploadUrl, contentType }
 *
 * The browser PUTs the file straight to R2 with `uploadUrl` (same Content-Type),
 * then registers it with POST /api/admin/blitz/assets. The file never passes
 * through this server, so size limits and double transfer do not apply.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as UploadUrlBody;
  const type = body.type?.toUpperCase();
  if (!type || !BLITZ_UPLOAD_TYPES.has(type)) {
    return NextResponse.json({ error: 'type must be BACKGROUND, OVERLAY, AUDIO or HOOK' }, { status: 400 });
  }
  const format = blitzUploadFormat(body.fileName ?? '');
  if (!format || !blitzAcceptsFile(type as BlitzUploadType, body.fileName ?? '')) {
    return NextResponse.json({ error: 'Unsupported file type for this layer' }, { status: 400 });
  }

  const r2Key = blitzKeys.upload(type as BlitzUploadType, format.ext);
  const uploadUrl = await getPresignedPutUrl(r2Key, format.contentType);
  if (!uploadUrl) {
    return NextResponse.json({ error: 'R2 not configured — uploads unavailable' }, { status: 503 });
  }
  return NextResponse.json({ r2Key, uploadUrl, contentType: format.contentType });
});
