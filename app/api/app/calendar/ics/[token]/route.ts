import { businessRoute } from '../../../../../../src/server/api';
import { buildIcs } from '../../../../../../src/server/calendar/digest';

type Ctx = { params: Promise<{ token: string }> };

/**
 * GET /api/app/calendar/ics/[token] — a subscribable feed for her phone calendar.
 * Public by design: calendar apps cannot send a bearer token, so the long random token is the key.
 */
export const GET = businessRoute(async (_req, { params }: Ctx) => {
  const ics = await buildIcs((await params).token);
  if (!ics) return new Response('Not found', { status: 404 });
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=600',
      'Content-Disposition': 'inline; filename="next5-posts.ics"',
    },
  });
});
