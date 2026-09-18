import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { burnCaptions } from '../../../../../../../src/server/admin/ugcCaption';
import { browserUrl, findVideo, putFile, toVideoDto, ugcKeys } from '../../../../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../../../../src/lib/db';

export const maxDuration = 300;

/** POST — Whisper word timings + ffmpeg burn-in from the saved raw video. Needs ffmpeg (local admin). */
export const POST = adminRoute(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const video = await findVideo(id);
  if (video.status !== 'ready' || !video.rawKey) {
    return NextResponse.json({ error: 'The video is not ready yet' }, { status: 409 });
  }

  let result: { buffer: Buffer; transcript: string };
  try {
    result = await burnCaptions(await browserUrl(video.rawKey), video.script);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Caption burn failed';
    const missingFfmpeg = /ENOENT|spawn ffmpeg/i.test(message);
    return NextResponse.json(
      { error: missingFfmpeg ? 'Captions run on the local admin only (ffmpeg not found).' : message },
      { status: missingFfmpeg ? 503 : 502 },
    );
  }

  const key = ugcKeys.captioned(id);
  await putFile(key, result.buffer, 'video/mp4');
  const updated = await prisma.ugcVideo.update({
    where: { id },
    data: { captionedKey: key, transcript: result.transcript },
    include: { character: true },
  });
  return NextResponse.json({ video: await toVideoDto(updated) });
});
