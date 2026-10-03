import { NextResponse, type NextRequest } from 'next/server';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { listDeckImages } from '../../../../../src/server/labs/deckImages';

/**
 * POST /api/admin/blitz/deck-images
 * Body: { keys: string[] } — the R2 keys the deck's shots use.
 * Returns: { images } — the still images among them, with their description.
 */
export const POST = labRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { keys?: unknown };
  const keys = Array.isArray(body.keys) ? body.keys.filter((k): k is string => typeof k === 'string') : [];
  return NextResponse.json({ images: await listDeckImages(keys) });
});
