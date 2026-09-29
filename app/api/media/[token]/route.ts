import sharp from 'sharp';
import { prisma } from '../../../../src/lib/db';
import { businessRoute } from '../../../../src/server/api';
import { HttpError } from '../../../../src/server/http';
import { parseSlideMediaId, readMediaToken } from '../../../../src/server/social/links';
import { getObject } from '../../../../src/server/storage/objectStore';

type Ctx = RouteContext<'/api/media/[token]'>;

/** A batch photo, or a rendered Auto Slideshow slide. */
const sourceKey = async (id: string): Promise<string | null> => {
  const slide = parseSlideMediaId(id);
  if (slide) {
    const show = await prisma.autoSlideshow.findUnique({ where: { id: slide.slideshowId }, select: { slides: true } });
    return (show?.slides as Array<{ imageKey?: string | null }> | undefined)?.[slide.index]?.imageKey ?? null;
  }
  const item = await prisma.batchItem.findUnique({ where: { id }, select: { r2Key: true } });
  return item?.r2Key ?? null;
};

/**
 * GET /api/media/<signed token>.jpg — one photo (batch photo or slideshow slide) as JPEG, for TikTok and Instagram to pull.
 * Public but signed and short-lived; this URL prefix is the one verified in the TikTok developer portal.
 */
export const GET = businessRoute<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const itemId = readMediaToken(token);
  if (!itemId) throw new HttpError(404, 'not_found', 'Not found.');
  const original = await sourceKey(itemId).then((key) => (key ? getObject(key) : null));
  if (!original) throw new HttpError(404, 'not_found', 'Not found.');
  const jpeg = await sharp(original).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
});
