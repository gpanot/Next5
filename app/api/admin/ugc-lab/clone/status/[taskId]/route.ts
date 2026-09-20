import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../../src/server/admin/route';

const POYO_STATUS_BASE = 'https://api.poyo.ai/api/generate/status';

type PoyoFile = { file_url: string; file_type: string };

type PoyoStatusResponse = {
  code: number;
  data?: {
    task_id: string;
    status: 'not_started' | 'running' | 'finished' | 'failed';
    progress: number;
    files?: PoyoFile[];
    error_message?: string | null;
  };
  error?: { message: string };
};

/**
 * GET /api/admin/ugc-lab/clone/status/:taskId
 * Proxies the Poyo task status endpoint and normalises the response.
 * Returns { status, progress, videoUrl?, error? }
 */
export const GET = adminRoute(async (_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) => {
  const { taskId } = await params;

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  const apiKey = process.env.POYO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'POYO_API_KEY is not configured' }, { status: 503 });
  }

  const poyoRes = await fetch(`${POYO_STATUS_BASE}/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });

  const poyoData = (await poyoRes.json()) as PoyoStatusResponse;

  if (!poyoRes.ok || !poyoData.data) {
    const msg = poyoData.error?.message ?? `Poyo returned ${poyoRes.status}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const { status, progress, files, error_message } = poyoData.data;

  // Pick the first video file URL from the finished result
  const videoUrl = files?.find((f) => f.file_type === 'video')?.file_url ?? null;

  return NextResponse.json({ status, progress: progress ?? 0, videoUrl, error: error_message ?? null });
});
