import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { HttpError } from '../../../../../src/server/http';
import type { PhotoTag } from '../../../../../src/lib/listingPhotos';
import { generateSlideshowCopy, type ListingFacts, type ReAngle } from '../../../../../src/server/labs/slideshowCopy';

type Body = { facts?: ListingFacts; angle?: ReAngle; photoTags?: (PhotoTag | 'other')[] };

// LLM call + possible retry can take up to ~60 s.
export const maxDuration = 70;

const RE_ANGLES: ReAngle[] = ['just_listed', 'price_reduction', 'open_house', 'feature_highlight', 'sold', 'neighborhood'];

/**
 * POST /api/admin/blitz/slideshow-copy
 * Body: { facts, angle, photoTags }
 * Returns: { copy }
 *
 * Thin route — all logic lives in src/server/labs/slideshowCopy.ts.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;
  if (!body.facts) throw new HttpError(400, 'missing_facts', 'facts is required.');
  if (!body.angle || !RE_ANGLES.includes(body.angle)) throw new HttpError(400, 'invalid_angle', 'angle is required and must be a valid ReAngle.');
  const photoTags = (body.photoTags ?? []).filter((t): t is PhotoTag => t !== 'other' && typeof t === 'string');

  const copy = await generateSlideshowCopy(body.facts, body.angle, photoTags);
  return NextResponse.json({ copy });
});
