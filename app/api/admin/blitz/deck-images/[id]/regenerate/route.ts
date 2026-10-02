import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { regenerateDeckImage } from '../../../../../../../src/server/labs/deckImages';

// GPT Image 2.5 takes about 30 s; the generator waits up to 5 min.
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/blitz/deck-images/[id]/regenerate — new image from the same prompt, same asset. */
export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json({ image: await regenerateDeckImage(id) });
});
