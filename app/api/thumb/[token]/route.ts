/**
 * GET /api/thumb/<signed key>.jpg — a 360 px JPEG preview of a stored photo (src/server/storage/thumbs.ts). Made on the
 * first request and stored; the link never changes, so the CDN and browser cache it for a year.
 */
import { waitUntil } from '@vercel/functions';
import { getObject, putObject } from '../../../../src/server/storage/objectStore';
import { makeThumb, readThumbToken, thumbKeyOf } from '../../../../src/server/storage/thumbs';

const CACHE = 'public, max-age=31536000, s-maxage=31536000, immutable';

const jpeg = (body: Buffer) => new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': CACHE } });

export const GET = async (_req: Request, ctx: { params: Promise<{ token: string }> }): Promise<Response> => {
  const key = readThumbToken((await ctx.params).token);
  if (!key) return new Response('Not found', { status: 404 });
  const stored = await getObject(thumbKeyOf(key)).catch(() => null);
  if (stored) return jpeg(stored);
  const original = await getObject(key).catch(() => null);
  if (!original) return new Response('Not found', { status: 404 });
  const thumb = await makeThumb(original);
  waitUntil(putObject(thumbKeyOf(key), thumb, 'image/jpeg').catch(() => undefined));
  return jpeg(thumb);
};
