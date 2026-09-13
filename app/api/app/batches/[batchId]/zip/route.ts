import { authedRoute } from '../../../../../../src/server/api';
import { requireOwnedBatch } from '../../../../../../src/server/generation/access';
import { zipBatch } from '../../../../../../src/server/generation/zip';
import { HttpError } from '../../../../../../src/server/http';

export const maxDuration = 60;

type Ctx = RouteContext<'/api/app/batches/[batchId]/zip'>;

/** GET …/zip?productId=&format= — download ready photos as a zip (max 200). */
export const GET = authedRoute<Ctx>(async (req, session, ctx) => {
  const { batchId } = await ctx.params;
  await requireOwnedBatch(session.userId, batchId);
  const params = new URL(req.url).searchParams;
  const result = await zipBatch(batchId, { productId: params.get('productId'), format: params.get('format') });
  if (!result) throw new HttpError(404, 'nothing_ready', 'No photos are ready to download yet.');
  return new Response(new Uint8Array(result.buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${result.name}"`,
      'Cache-Control': 'no-store',
    },
  });
});
