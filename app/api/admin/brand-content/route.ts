import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { addBrandPhoto, listBrandPhotos } from '../../../../src/server/brandContent/brandPhotos';
import { HttpError } from '../../../../src/server/http';
import { labRoute } from '../../../../src/server/labs/labAccess';
import { enforceRateLimit } from '../../../../src/server/rateLimit';
import { readForm } from '../../../../src/server/storage/images';

export const maxDuration = 60;

/** GET /api/admin/brand-content — the workspace's own photos (Content › Your Brand Content), newest first. */
export const GET = labRoute(async (_req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Brand content belongs to a workspace.');
  return NextResponse.json(await listBrandPhotos(access.workspaceId));
});

/**
 * POST /api/admin/brand-content — multipart `file` (JPG, PNG, WebP or HEIC, up to 12 MB) → the saved photo. Its
 * description (vision model) is written after the response, in the background.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Brand content belongs to a workspace.');
  await enforceRateLimit(`brand-photo:${access.userId}`, 100, 3600);
  const file = (await readForm(req)).get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'file_required', 'Upload a photo.');
  const { photo, describe } = await addBrandPhoto(access.workspaceId, file);
  waitUntil(describe());
  return NextResponse.json(photo, { status: 201 });
});
