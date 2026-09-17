import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';

type TaskStatus = {
  status?: string;
  state?: string;
  output?: {
    video_url?: string;
    url?: string;
    video_urls?: string[];
  };
  error?: string;
};

export const GET = adminRoute(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;

  const result = await tregCall<TaskStatus>(
    'reapi.tasks.get',
    { query: { id }, timeoutMs: 15_000 },
  );

  const status = result.status ?? result.state ?? 'unknown';
  const video_url =
    result.output?.video_url ??
    result.output?.url ??
    result.output?.video_urls?.[0];

  return NextResponse.json({ status, video_url, error: result.error });
});
