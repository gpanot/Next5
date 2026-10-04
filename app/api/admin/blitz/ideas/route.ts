import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { HttpError } from '../../../../../src/server/http';
import { generateIdeas, listIdeas } from '../../../../../src/server/labs/calendarIdeas';
import { labRoute } from '../../../../../src/server/labs/labAccess';

// The Blitz deck (several briefs, library search, AI images for shots the library lacks) plus bank picks.
export const maxDuration = 300;

/** GET /api/admin/blitz/ideas — the workspace's calendar ideas from today on, and its slideshow share. Users only. */
export const GET = labRoute(async (_req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Ideas belong to a workspace.');
  return NextResponse.json(await listIdeas(access.workspaceId));
});

/**
 * POST /api/admin/blitz/ideas — { runId, tzOffsetMin } → a new batch of ideas on the next two weeks. Free. Its slideshow
 * ideas keep being made after the response (each in its own hidden run); the list shows them as "making" until ready.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Ideas belong to a workspace.');
  const body = (await req.json().catch(() => ({}))) as { runId?: unknown; tzOffsetMin?: unknown };
  if (typeof body.runId !== 'string') throw new HttpError(400, 'missing_run', 'runId is required.');
  const { list, work } = await generateIdeas(access.workspaceId, body.runId, body.tzOffsetMin);
  waitUntil(work().catch((err: unknown) => console.error('[calendar-ideas] slideshow ideas failed:', err)));
  return NextResponse.json(list, { status: 201 });
});
