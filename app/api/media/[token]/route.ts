import sharp from 'sharp';
import { prisma } from '../../../../src/lib/db';
import { businessRoute } from '../../../../src/server/api';
import { HttpError } from '../../../../src/server/http';
import { readMediaToken } from '../../../../src/server/social/links';
import { getObject } from '../../../../src/server/storage/objectStore';

type Ctx = RouteContext<'/api/media/[token]'>;

/**
 * GET /api/media/<signed token>.jpg — one photo as JPEG, for TikTok and Instagram to pull when posting.
 * Public but signed and short-lived; this URL prefix is the one verified in the TikTok developer portal.
 */
export const GET = businessRoute<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const itemId = readMediaToken(token);
  if (!itemId) throw new HttpError(404, 'not_found', 'Not found.');
  const item = await prisma.batchItem.findUnique({ where: { id: itemId }, select: { r2Key: true } });
  const original = item?.r2Key ? await getObject(item.r2Key) : null;
  if (!original) throw new HttpError(404, 'not_found', 'Not found.');
  const jpeg = await sharp(original).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
});
