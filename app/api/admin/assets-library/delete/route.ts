import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { HttpError } from '../../../../../src/server/http';
import { deleteLibraryAssets, isLibrarySection } from '../../../../../src/server/admin/libraryDelete';

/**
 * POST /api/admin/assets-library/delete  Body: { section, ids: string[] }
 * Deletes assets of one Assets Library section (row, description, files). Returns { deleted, failed }.
 */
export const POST = adminRoute(async (req) => {
  const body = (await req.json().catch(() => ({}))) as { section?: unknown; ids?: unknown };
  if (!isLibrarySection(body.section)) throw new HttpError(400, 'bad_section', 'Unknown section.');
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
  return NextResponse.json(await deleteLibraryAssets(body.section, ids));
});
