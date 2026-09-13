import { prisma } from '../../../../../src/lib/db';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { presignObject } from '../../../../../src/server/storage/objectStore';

/** GET — photos customers redid or rated down, newest first, with inputs for side-by-side review. */
export const GET = adminRoute(async () => {
  const items = await prisma.batchItem.findMany({
    where: { OR: [{ redoReason: { not: null } }, { rating: -1 }] },
    include: { batch: { select: { name: true, kind: true, workspace: { select: { name: true, product: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  return json({
    items: await Promise.all(items.map(async (i) => ({
      id: i.id, batchName: i.batch.name, workspace: i.batch.workspace.name, product: i.batch.workspace.product,
      reason: i.redoReason, rating: i.rating, status: i.status, freeRedosUsed: i.freeRedosUsed, shot: i.shot, sceneId: i.sceneId, format: i.format,
      outputUrl: i.r2Key ? await presignObject(i.r2Key) : null,
      inputUrls: await Promise.all(i.inputR2Keys.map((k) => presignObject(k))),
      prompt: i.prompt,
    }))),
  });
});
