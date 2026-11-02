/**
 * GET /api/slideshow/workspaces/[workspaceId]/target — { target }: the target client (age range, gender) and the age
 *     range read from the website
 * PUT /api/slideshow/workspaces/[workspaceId]/target — { age, gender, industries? } → { target }. Releases the first run
 *     waiting for the pick (it goes on from step 4 here, or re-plans from step 3 when the client types changed).
 */
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { runAutoPipeline } from '../../../../../../src/server/autoSlideshow/pipeline';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { getTargetClient, saveTargetClient } from '../../../../../../src/server/autoSlideshow/targetClient';
import { readJsonObject } from '../../../../../../src/server/http';
import { editCustomerIndustries, parseIndustries } from '../../../../../../src/server/studio/customerIndustries';
import { followIndustriesEdit } from '../../../../../../src/server/studio/followIndustriesEdit';

// Step 4 of a released run runs here; on Vercel steps 5-6 continue in their own invocation (see the pipeline hand-off).
export const maxDuration = 300;

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  return NextResponse.json({ target: await getTargetClient(requireUser(access).userId, workspaceId) });
});

export const PUT = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  const userId = requireUser(access).userId;
  const body = await readJsonObject(req);
  const industries = body.industries === undefined ? null : parseIndustries(body.industries);
  const edit = industries ? await editCustomerIndustries(workspaceId, industries, userId) : null;
  const { target, released } = await saveTargetClient(userId, workspaceId, body);
  if (edit?.changed) waitUntil(followIndustriesEdit(edit, released));
  else for (const runId of released) waitUntil(runAutoPipeline(runId, 4));
  return NextResponse.json({ target });
});
