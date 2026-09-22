import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { presignObject } from '../../../../../src/server/storage/objectStore';

/**
 * GET /api/admin/gallery-faces/presign?key=gallery-drafts/...
 *
 * Returns a fresh 24-hour presigned URL for any gallery-drafts/ R2 key.
 * Used by the "Create Face" tab to refresh URLs for persisted drafts.
 */
export const GET = adminRoute(async (req: NextRequest) => {
  const key = new URL(req.url).searchParams.get('key');
  if (!key || (!key.startsWith('gallery-drafts/') && !key.startsWith('influencer-gallery/'))) {
    return NextResponse.json({ error: 'key must be a gallery-drafts/ or influencer-gallery/ path' }, { status: 400 });
  }
  const url = await presignObject(key);
  if (!url) return NextResponse.json({ error: 'Object not found or storage not configured' }, { status: 404 });
  return NextResponse.json({ url });
});
