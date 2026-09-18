import { adminRoute, json } from '../../../../../src/server/admin/route';
import { toVideoDto } from '../../../../../src/server/admin/ugcStore';
import { refreshVideo } from '../../../../../src/server/admin/ugcVideos';
import { generationEtas } from '../../../../../src/server/admin/ugcStats';
import { prisma } from '../../../../../src/lib/db';

export const maxDuration = 60;

/** GET — latest videos, newest first, plus wait estimates per length. Videos still generating are checked with Treg first. */
export const GET = adminRoute(async () => {
  const videos = await prisma.ugcVideo.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { character: true } });
  const refreshed = await Promise.all(videos.map((v) => refreshVideo(v)));
  const [dtos, etas] = await Promise.all([Promise.all(refreshed.map(toVideoDto)), generationEtas()]);
  return json({ videos: dtos, etas });
});
