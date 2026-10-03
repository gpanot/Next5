import sharp from 'sharp';
import { prisma } from '../../../../src/lib/db';
import { businessRoute } from '../../../../src/server/api';
import { HttpError } from '../../../../src/server/http';
import { parseBlitzMediaId, parseSlideMediaId, readMediaToken } from '../../../../src/server/social/links';
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

/** A rendered Blitz video (scheduled post), as stored. */
const blitzVideo = async (projectId: string): Promise<Response> => {
  const project = await prisma.blitzProject.findUnique({ where: { id: projectId }, select: { renderedVideoKey: true } });
  const mp4 = project?.renderedVideoKey ? await getObject(project.renderedVideoKey) : null;
  if (!mp4) throw new HttpError(404, 'not_found', 'Not found.');
  return new Response(new Uint8Array(mp4), { headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(mp4.length), 'Cache-Control': 'private, max-age=3600' } });
};

/**
 * GET /api/media/<signed token>.jpg — one photo (batch photo or slideshow slide) as JPEG, for TikTok and Instagram to pull.
 * GET /api/media/<signed token>.mp4 — a rendered Blitz video, for TikTok to pull a scheduled post.
 * Public but signed and short-lived; this URL prefix is the one verified in the TikTok developer portal.
 */
export const GET = businessRoute<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const itemId = readMediaToken(token);
  if (!itemId) throw new HttpError(404, 'not_found', 'Not found.');
  const blitzId = parseBlitzMediaId(itemId);
  if (blitzId) return blitzVideo(blitzId);
  const original = await sourceKey(itemId).then((key) => (key ? getObject(key) : null));
  if (!original) throw new HttpError(404, 'not_found', 'Not found.');
  const jpeg = await sharp(original).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
});
