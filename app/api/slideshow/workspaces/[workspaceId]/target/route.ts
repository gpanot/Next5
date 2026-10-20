/**
 * GET /api/slideshow/workspaces/[workspaceId]/target — { target }: the target client (age range, gender) and the age
 *     range read from the website
 * PUT /api/slideshow/workspaces/[workspaceId]/target — { age, gender } → { target }. Releases the first run waiting for
 *     the pick (it goes on from step 4 here).
 */
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { runAutoPipeline } from '../../../../../../src/server/autoSlideshow/pipeline';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { getTargetClient, saveTargetClient } from '../../../../../../src/server/autoSlideshow/targetClient';
import { readJsonObject } from '../../../../../../src/server/http';

// Step 4 of a released run runs here; on Vercel steps 5-6 continue in their own invocation (see the pipeline hand-off).
export const maxDuration = 300;

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  return NextResponse.json({ target: await getTargetClient(requireUser(access).userId, workspaceId) });
});

export const PUT = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  const { target, released } = await saveTargetClient(requireUser(access).userId, workspaceId, await readJsonObject(req));
  for (const runId of released) waitUntil(runAutoPipeline(runId, 4));
  return NextResponse.json({ target });
});
