import JSZip from 'jszip';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError } from '../../../../../src/server/http';
import { buildFileNames, MAX_ZIP_FILES } from '../../../../../src/server/generation/zip';
import { getObject } from '../../../../../src/server/storage/objectStore';

export const maxDuration = 60;

/** GET /api/app/library/zip?ids=a,b,c — zip of selected photos the user owns (max 200). */
export const GET = authedRoute(async (req, session) => {
  const ids = (new URL(req.url).searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, MAX_ZIP_FILES);
  if (ids.length === 0) throw new HttpError(400, 'no_items', 'Select photos to download.');
  const items = await prisma.batchItem.findMany({
    where: { id: { in: ids }, status: 'ready', r2Key: { not: null }, batch: { workspace: { ownerUserId: session.userId } } },
    include: { product: { select: { sku: true, name: true } }, batch: { select: { themeId: true } } },
  });
  if (items.length === 0) throw new HttpError(404, 'nothing_ready', 'Those photos are not available.');
  const names = buildFileNames(items.map((i) => ({ sceneId: i.sceneId, shot: i.shot, format: i.format, themeId: i.batch.themeId, productLabel: i.product ? (i.product.sku || i.product.name.replace(/\s+/g, '-')) : null })));
  const zip = new JSZip();
  await Promise.all(items.map(async (item, index) => {
    const body = item.r2Key ? await getObject(item.r2Key) : null;
    if (body) zip.file(names[index] ?? `${item.id}.jpg`, body);
  }));
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  return new Response(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="next5-photos.zip"', 'Cache-Control': 'no-store' },
  });
});
