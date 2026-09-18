import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { deleteFiles, findVideo, toVideoDto } from '../../../../../../src/server/admin/ugcStore';
import { refreshVideo } from '../../../../../../src/server/admin/ugcVideos';
import { prisma } from '../../../../../../src/lib/db';

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** GET — one video; checked with Treg first while it is still generating. */
export const GET = adminRoute(async (_req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const video = await refreshVideo(await findVideo(id));
  return json({ video: await toVideoDto(video) });
});

/** DELETE — removes the video and its files. The character stays. */
export const DELETE = adminRoute(async (_req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const video = await findVideo(id);
  await prisma.ugcVideo.delete({ where: { id } });
  await deleteFiles([video.rawKey, video.captionedKey]);
  return json({ ok: true });
});
