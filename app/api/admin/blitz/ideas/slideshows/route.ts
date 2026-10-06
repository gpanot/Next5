import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { HttpError } from '../../../../../../src/server/http';
import { createSlideshowIdeas } from '../../../../../../src/server/labs/calendarIdeas';
import { labRoute } from '../../../../../../src/server/labs/labAccess';

// The slideshows are made after the response (waitUntil), within this limit.
export const maxDuration = 300;

/**
 * POST /api/admin/blitz/ideas/slideshows — { runId, tzOffsetMin } → 3 new slideshow ideas, made after the response
 * (each in its own hidden run) and shown first in the deck once ready. 402 when the balance can't cover keeping all 3.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Ideas belong to a workspace.');
  const body = (await req.json().catch(() => ({}))) as { runId?: unknown; tzOffsetMin?: unknown };
  if (typeof body.runId !== 'string') throw new HttpError(400, 'missing_run', 'runId is required.');
  const { list, work } = await createSlideshowIdeas(access.workspaceId, access.userId, body.runId, body.tzOffsetMin);
  waitUntil(work().catch((err: unknown) => console.error('[calendar-ideas] requested slideshows failed:', err)));
  return NextResponse.json(list, { status: 201 });
});
