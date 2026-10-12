/**
 * POST /api/slideshow/workspaces/[workspaceId]/onboarding/complete — { skippedSteps?, lastStep? } → { profile }.
 * Ends the onboarding flow; idempotent (the first completion time is kept).
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../../src/server/autoSlideshow/access';
import { completeOnboarding } from '../../../../../../../src/server/autoSlideshow/onboarding';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return NextResponse.json({ profile: await completeOnboarding(requireUser(access).userId, workspaceId, body ?? {}) });
});
