/**
 * POST /api/admin/auto-slideshow/runs/[runId]/posts/[postId] — { action: 'now' | 'cancel' | 'refresh' }
 * now: send it immediately (also retries a failed post) · cancel: stop a scheduled or failed post · refresh: ask TikTok for its status
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../../src/server/admin/route';
import { cancelPost, listPosts, postNow, refreshPost } from '../../../../../../../../src/server/autoSlideshow/posting';
import { HttpError } from '../../../../../../../../src/server/http';

export const maxDuration = 60;

type Ctx = { params: Promise<{ runId: string; postId: string }> };

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId, postId } = await ctx.params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: unknown };
  if (action === 'now') await postNow(runId, postId);
  else if (action === 'cancel') await cancelPost(runId, postId);
  else if (action === 'refresh') await refreshPost(postId);
  else throw new HttpError(400, 'bad_action', 'action must be now, cancel or refresh.');
  return json({ posts: await listPosts(runId) });
});
