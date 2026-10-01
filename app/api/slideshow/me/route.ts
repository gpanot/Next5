/** GET /api/slideshow/me?workspace= — the signed-in user's profile, that workspace and its connected TikTok / Instagram accounts */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { requireUser, workspaceParam } from '../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';
import { listSlideshowWorkspaces } from '../../../../src/server/autoSlideshow/workspaces';
import { listConnections, PROVIDERS } from '../../../../src/server/social/connections';
import { SOCIAL_PROVIDERS } from '../../../../src/server/social/types';
import type { SlideshowMeDto } from '../../../../src/types/admin/autoSlideshow';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const workspaceId = await workspaceParam(req, user);
  const [profile, workspaces, connections] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.userId }, select: { displayName: true } }),
    listSlideshowWorkspaces(user.userId),
    listConnections(workspaceId),
  ]);
  const me: SlideshowMeDto = {
    email: user.email,
    displayName: profile.displayName,
    workspace: workspaces.find((w) => w.id === workspaceId)!,
    connections,
    available: SOCIAL_PROVIDERS.filter((p) => PROVIDERS[p].configured()),
  };
  return NextResponse.json(me);
});
