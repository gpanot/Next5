import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { getCloneVideoByTaskId } from '../../../../../../../src/server/admin/cloneVideos';
import { tregCall } from '../../../../../../../src/server/admin/ugcLab';

type RreapiTaskResult = {
  id?: string;
  status?: string;
  output?: { video_urls?: string[]; video_url?: string };
  error?: string | { message?: string };
};

/**
 * GET /api/admin/ugc-lab/clone/status/:taskId
 *
 * 1. If the job is in the DB: refresh (mirrors to R2 when done) and return the DB status.
 * 2. Otherwise (orphan reapi task): poll reapi.tasks.get directly.
 *
 * Returns { status: 'running' | 'finished' | 'failed', progress, videoUrl?, error? }
 */
export const GET = adminRoute(async (_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) => {
  const { taskId } = await params;

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  // ── Path 1: task is in DB — refresh via server module (mirrors to R2) ─────
  const dbVideo = await getCloneVideoByTaskId(taskId).catch(() => null);
  if (dbVideo) {
    const uiStatus =
      dbVideo.status === 'ready'   ? 'finished' :
      dbVideo.status === 'failed'  ? 'failed'   : 'running';

    return NextResponse.json({
      status:    uiStatus,
      progress:  dbVideo.status === 'ready' ? 100 : 0,
      videoUrl:  dbVideo.videoUrl,
      error:     dbVideo.error ?? null,
      libraryId: dbVideo.id,
    });
  }

  // ── Path 2: orphan task not in DB — poll reapi directly ──────────────────
  try {
    const result = await tregCall<RreapiTaskResult>('reapi.tasks.get', {
      query: { task_id: taskId },
      timeoutMs: 30_000,
    });

    const status  = result.status ?? 'processing';
    const videoUrl =
      result.output?.video_urls?.[0] ?? result.output?.video_url ?? null;
    const errMsg =
      typeof result.error === 'string'
        ? result.error
        : result.error?.message ?? null;

    const uiStatus =
      status === 'completed' ? 'finished' :
      status === 'failed'    ? 'failed'   : 'running';

    return NextResponse.json({
      status: uiStatus,
      progress: uiStatus === 'finished' ? 100 : 0,
      videoUrl,
      error: errMsg,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to fetch task status' },
      { status: 502 },
    );
  }
});
