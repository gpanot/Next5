/**
 * GET   /api/slideshow/workspaces/[workspaceId]/onboarding — { profile }: the onboarding answers, made on the first run's
 *       first visit so a reload resumes at `lastStep`; null when this workspace does not get the flow
 * PATCH /api/slideshow/workspaces/[workspaceId]/onboarding — { goals?, goalsOther?, pains?, painsOther?, postingMode?,
 *       monthlySpend?, lastStep?, skippedStep? } → { profile }. Stats only: generation never reads these answers.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { getOnboarding, patchOnboarding } from '../../../../../../src/server/autoSlideshow/onboarding';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { readJsonObject } from '../../../../../../src/server/http';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  return NextResponse.json({ profile: await getOnboarding(requireUser(access).userId, workspaceId) });
});

export const PATCH = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  return NextResponse.json({ profile: await patchOnboarding(requireUser(access).userId, workspaceId, await readJsonObject(req)) });
});
