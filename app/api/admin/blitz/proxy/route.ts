import { type NextRequest, NextResponse } from 'next/server';
import { streamFromR2 } from '../../../../../src/lib/r2';

/**
 * GET /api/admin/blitz/proxy?key=blitz/assets/foo.webm
 *
 * Same-origin streaming proxy for Blitz Lab assets stored in R2.
 * Solves the browser CORS restriction that prevents @remotion/media's Video
 * component (used for colorKey chroma keying) from reading R2 presigned URLs.
 *
 * Security: only keys under blitz/ are served — no other bucket content is accessible.
 * Range requests are forwarded so video seeking works in the Remotion Player.
 * Cache-Control is set so the browser caches assets for 1 hour.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? '';

  // Only allow blitz/ keys — prevents access to other bucket content
  if (!key.startsWith('blitz/') || key.includes('..') || key.includes('\0')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const range = req.headers.get('range') ?? undefined;
  const { body, status, headers } = await streamFromR2(key, range);

  if (!body) {
    return NextResponse.json({ error: 'Not found' }, { status: status === 404 ? 404 : 503 });
  }

  return new NextResponse(body as BodyInit, {
    status,
    headers: {
      ...headers,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
