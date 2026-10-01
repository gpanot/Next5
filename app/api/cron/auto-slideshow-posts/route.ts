import { NextResponse } from 'next/server';
import { runPostingTick } from '../../../../src/server/autoSlideshow/send';

export const maxDuration = 60;

/**
 * GET /api/cron/auto-slideshow-posts — sends approved Auto Slideshow posts that are due (TikTok, Instagram), polls sent
 * ones until they are live, and refreshes the numbers (views, likes…) of recent posts.
 * Call every 5-15 minutes with `Authorization: Bearer $CRON_SECRET`. Idempotent: a post is claimed before it is sent.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await runPostingTick()) });
}
