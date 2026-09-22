import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { deleteObject } from '../../../../../src/server/storage/objectStore';

/**
 * DELETE /api/admin/gallery-faces/draft
 * Body: { generatedKey, referenceKey }
 *
 * Deletes both R2 objects for a draft (the reference photo and the generated image).
 */
export const DELETE = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { generatedKey?: string; referenceKey?: string };

  const { generatedKey, referenceKey } = body;
  if (!generatedKey && !referenceKey) {
    return NextResponse.json({ error: 'At least one of generatedKey or referenceKey is required' }, { status: 400 });
  }

  await Promise.allSettled([
    generatedKey ? deleteObject(generatedKey) : Promise.resolve(),
    referenceKey ? deleteObject(referenceKey) : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true });
});
