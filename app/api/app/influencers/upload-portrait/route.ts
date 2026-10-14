import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError } from '../../../../../src/server/http';
import { putObject, presignObject } from '../../../../../src/server/storage/objectStore';
import { normalizeUpload, readForm } from '../../../../../src/server/storage/images';
import { portraitPreviewKey } from '../../../../../src/server/sets/portrait';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';

export const maxDuration = 30;

/**
 * POST /api/app/influencers/upload-portrait
 * Multipart: file (image/jpeg|png|webp)
 * Returns: { r2Key, url } — short-lived presigned URL for preview.
 */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`portrait-upload:${session.userId}`, 30, 3600);

  const form = await readForm(req);
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new HttpError(400, 'file_required', 'Upload an image file.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new HttpError(400, 'invalid_type', 'Only JPEG, PNG, and WebP photos are accepted.');
  }

  const buffer = await normalizeUpload(file, 'portrait photo');
  const r2Key = portraitPreviewKey(randomUUID());
  await putObject(r2Key, buffer, 'image/jpeg');
  const url = await presignObject(r2Key);

  return NextResponse.json({ r2Key, url }, { status: 201 });
});
