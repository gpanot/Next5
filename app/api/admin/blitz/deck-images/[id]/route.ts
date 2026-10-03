import { NextResponse, type NextRequest } from 'next/server';
import { assertAssetOwned, labRoute } from '../../../../../../src/server/labs/labAccess';
import { deleteDeckImage } from '../../../../../../src/server/labs/deckImages';

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/admin/blitz/deck-images/[id] — removes a deck image from the library, file included. */
export const DELETE = labRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  await assertAssetOwned(access, id);
  return NextResponse.json(await deleteDeckImage(id));
});
