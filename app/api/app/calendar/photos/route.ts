import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { listAddablePhotos } from '../../../../../src/server/calendar/calendar';
import { presignObject } from '../../../../../src/server/storage/objectStore';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

/** GET /api/app/calendar/photos?cursor= — photos she can still add to a day, newest first. */
export const GET = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const cursor = new URL(req.url).searchParams.get('cursor');
  const { rows, nextCursor } = await listAddablePhotos(ws.id, cursor);
  const photos = await Promise.all(rows.map(async (r) => ({ id: r.id, url: r.r2Key ? await presignObject(r.r2Key) : null, batchName: r.batch.name })));
  return NextResponse.json({ photos, nextCursor });
});
