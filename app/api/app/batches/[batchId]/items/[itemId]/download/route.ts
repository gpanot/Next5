import { prisma } from '../../../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../../../src/server/api';
import { requireOwnedBatch } from '../../../../../../../../src/server/generation/access';
import { HttpError } from '../../../../../../../../src/server/http';
import { getObject } from '../../../../../../../../src/server/storage/objectStore';

type Ctx = RouteContext<'/api/app/batches/[batchId]/items/[itemId]/download'>;

const safeName = (raw: string | null): string => {
  const base = (raw ?? '').replace(/\.jpe?g$/i, '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return `${base || 'next5-photo'}.jpg`;
};

/**
 * GET …/items/[itemId]/download?name= — one ready photo as a JPEG attachment.
 * Served from our origin: the browser can't fetch signed storage URLs directly (no CORS on the bucket).
 */
export const GET = authedRoute<Ctx>(async (req, session, ctx) => {
  const { batchId, itemId } = await ctx.params;
  await requireOwnedBatch(session.userId, batchId);
  const item = await prisma.batchItem.findFirst({ where: { id: itemId, batchId, status: 'ready' }, select: { r2Key: true } });
  const image = item?.r2Key ? await getObject(item.r2Key) : null;
  if (!image) throw new HttpError(404, 'photo_not_ready', 'This photo is not ready to download yet.');
  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${safeName(new URL(req.url).searchParams.get('name'))}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
