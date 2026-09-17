import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';
import { burnCaptions } from '../../../../../../src/server/admin/ugcCaption';
import { uploadToR2, getPresignedUrl } from '../../../../../../src/lib/r2';

type TaskStatus = {
  status?: string;
  output?: { video_url?: string; url?: string; video_urls?: string[] };
};

export const POST = adminRoute(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;

  // 1. Look up the task to get the raw video URL
  const task = await tregCall<TaskStatus>(
    'reapi.tasks.get',
    { query: { id }, timeoutMs: 15_000 },
  );

  const videoUrl =
    task.output?.video_url ??
    task.output?.url ??
    task.output?.video_urls?.[0];

  if (!videoUrl) {
    return NextResponse.json(
      { error: 'Task not completed or video URL not found' },
      { status: 400 },
    );
  }

  // 2. Download video → Whisper → FFmpeg caption burn
  const { buffer, transcript } = await burnCaptions(videoUrl);

  // 3. Upload captioned video to R2
  const key = `ugc-lab/captioned/${id}-captioned.mp4`;
  await uploadToR2(key, buffer, 'video/mp4');

  // 4. Return 24-hour presigned URL
  const captioned_url = await getPresignedUrl(key, 24 * 3600);

  if (!captioned_url) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }

  return NextResponse.json({ captioned_url, transcript });
});
