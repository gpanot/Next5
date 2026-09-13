import { getObject, storageDriver, verifyLocalSignature } from '../../../../src/server/storage/objectStore';

/** GET /api/dev/object?key=&exp=&sig= — serves local object-store files. 404 in production or with R2 storage. */
export async function GET(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production' || storageDriver() !== 'local') {
    return new Response('Not found', { status: 404 });
  }
  const params = new URL(req.url).searchParams;
  const key = params.get('key') ?? '';
  const exp = Number(params.get('exp'));
  const sig = params.get('sig') ?? '';
  if (!key || !verifyLocalSignature(key, exp, sig)) return new Response('Forbidden', { status: 403 });

  const body = await getObject(key);
  if (!body) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' },
  });
}
