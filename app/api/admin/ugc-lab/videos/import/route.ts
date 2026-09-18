import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { toVideoDto } from '../../../../../../src/server/admin/ugcStore';
import { importVideo } from '../../../../../../src/server/admin/ugcVideos';

export const maxDuration = 120;

type ImportItem = { taskId?: unknown; hook?: unknown; estimatedCostUsd?: unknown; createdAt?: unknown };

/**
 * POST { items: [{ taskId, hook, estimatedCostUsd, createdAt }] } — the old browser-only library.
 * Videos whose provider link is still valid (under 7 days) are saved to R2; older ones come back as failed.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const { items } = (await req.json()) as { items?: ImportItem[] };
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Nothing to import' }, { status: 400 });
  }

  const imported = [];
  const failed: string[] = [];
  for (const item of items.slice(0, 50)) {
    if (typeof item.taskId !== 'string' || !item.taskId) continue;
    try {
      imported.push(await importVideo({
        taskId: item.taskId,
        script: typeof item.hook === 'string' ? item.hook : '',
        estimatedCostUsd: typeof item.estimatedCostUsd === 'number' ? item.estimatedCostUsd : 0,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
      }));
    } catch (err) {
      // One bad video must not lose the rest of the import.
      console.error('[ugc] import failed for', item.taskId, err);
      failed.push(item.taskId);
    }
  }
  return NextResponse.json({ videos: await Promise.all(imported.map(toVideoDto)), failed });
});
