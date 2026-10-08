import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { deleteAiPictures } from '../../../../../../src/server/admin/aiPictures';

/**
 * POST /api/admin/assets-library/ai-pictures/delete  Body: { ids: string[] }
 * Deletes AI pictures from the library (row, description, file). Returns { deleted, failed }.
 */
export const POST = adminRoute(async (req) => {
  const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
  return NextResponse.json(await deleteAiPictures(ids));
});
