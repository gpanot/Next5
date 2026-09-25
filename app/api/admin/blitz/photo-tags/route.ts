import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { HttpError } from '../../../../../src/server/http';
import { tagListingPhotos } from '../../../../../src/server/labs/photoTags';

type Body = { photoUrls?: string[] };

/**
 * POST /api/admin/blitz/photo-tags
 * Body: { photoUrls: string[] }
 * Returns: { photoTags: (PhotoTag | 'other')[] }
 *
 * Tags are stored client-side in zillowData after "Use selected" is pressed.
 * The slideshow-copy route then receives them directly — no re-tagging needed.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;
  const photoUrls = Array.isArray(body.photoUrls) ? body.photoUrls.filter((u): u is string => typeof u === 'string') : [];
  if (photoUrls.length === 0) throw new HttpError(400, 'no_urls', 'Provide at least one photo URL.');

  const photoTags = await tagListingPhotos(photoUrls);
  return NextResponse.json({ photoTags });
});
