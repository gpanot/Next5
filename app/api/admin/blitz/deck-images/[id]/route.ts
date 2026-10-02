import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { deleteDeckImage } from '../../../../../../src/server/labs/deckImages';

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/admin/blitz/deck-images/[id] — removes a deck image from the library, file included. */
export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json(await deleteDeckImage(id));
});
