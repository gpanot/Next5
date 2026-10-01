/**
 * POST /api/admin/auto-slideshow/runs/[runId]/posts/[postId] — { action: 'now' | 'cancel' | 'refresh' }
 * now: send it immediately (also retries a failed post) · cancel: stop a scheduled or failed post ·
 * refresh: ask the platform for its status (publishing) or its numbers (posted)
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../src/server/autoSlideshow/route';
import { cancelPost, listPosts, postNow } from '../../../../../../../../src/server/autoSlideshow/posting';
import { refreshPost } from '../../../../../../../../src/server/autoSlideshow/send';
import { refreshStats } from '../../../../../../../../src/server/autoSlideshow/stats';
import { prisma } from '../../../../../../../../src/lib/db';
import { HttpError } from '../../../../../../../../src/server/http';

export const maxDuration = 60;

type Ctx = { params: Promise<{ runId: string; postId: string }> };

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, postId } = await ctx.params;
  await assertRunAccess(access, runId);
  const { action } = (await req.json().catch(() => ({}))) as { action?: unknown };
  if (action === 'now') await postNow(runId, postId);
  else if (action === 'cancel') await cancelPost(runId, postId);
  else if (action === 'refresh') {
    const post = await prisma.autoSlideshowPost.findFirst({ where: { id: postId, runId } });
    if (!post) throw new HttpError(404, 'post_not_found', 'Post not found.');
    // Sent and publishing: ask for its status. Already posted: read its numbers now.
    if (post.status === 'posted') await refreshStats(post);
    else await refreshPost(postId);
  }
  else throw new HttpError(400, 'bad_action', 'action must be now, cancel or refresh.');
  return json({ posts: await listPosts(runId) });
});
