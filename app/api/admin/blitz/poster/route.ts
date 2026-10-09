import { type NextRequest, NextResponse } from 'next/server';
import { blitzPoster, isBlitzVideoKey } from '../../../../../src/server/labs/blitzPoster';

/**
 * GET /api/admin/blitz/poster?key=blitz/assets/foo.mp4
 *
 * A Blitz clip's first frame as a JPEG, for calendar tiles and rows. Made once, then served from R2. Same key rules as
 * the proxy (only blitz/ clips). A clip's key never changes content, so browsers keep the poster for a week.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? '';
  if (!isBlitzVideoKey(key)) return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  try {
    const jpg = await blitzPoster(key);
    if (!jpg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new NextResponse(new Uint8Array(jpg), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=604800, immutable' },
    });
  } catch (err) {
    console.warn('[blitz:poster]', key, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Poster failed' }, { status: 503 });
  }
}
