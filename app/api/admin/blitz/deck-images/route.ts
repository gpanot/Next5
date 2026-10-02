import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { listDeckImages } from '../../../../../src/server/labs/deckImages';

/**
 * POST /api/admin/blitz/deck-images
 * Body: { keys: string[] } — the R2 keys the deck's shots use.
 * Returns: { images } — the still images among them, with their description.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { keys?: unknown };
  const keys = Array.isArray(body.keys) ? body.keys.filter((k): k is string => typeof k === 'string') : [];
  return NextResponse.json({ images: await listDeckImages(keys) });
});
